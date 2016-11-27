const express = require('express')
const bodyParser = require('body-parser')
const bluebird = require('bluebird')
const redis = require('redis')
const Raven = require('raven')
const url = require('url')
const Hasher = require('hashids')

const config = require('./config')

bluebird.promisifyAll(redis.RedisClient.prototype);

const client = redis.createClient(config.dbpath, {password: config.dbpass})
const raven = new Raven.Client(config.raven)
const hasher = new Hasher(config.salt, config.minSlugLength, config.alphabet)
const app = express()

let index = 0

process.on('uncaughtException', e => raven.captureException(e))
/*
app.use((req, res, next) => {
	if (req.method.toUpperCase() === 'GET' && req.url === '/') {
		req.url = '/static.d/'
	}
	next()
})
*/
app.use( express.static(__dirname + '/public'))

app.put('/', bodyParser.json(), (req, res) => {
	const hash = hasher.encode(++index)
	let target = req.body.url
	if (hash == null) {
		return res.status(400).json({message: 'Must Provide A Url To Shorten'})
	}
	if (url.parse(target).protocol == null) {
		target = `http://${target}`
	}
	client.msetAsync(
		'conf::index', index,
		hash, target
	)
		.then(
			() => {
				res.status(200).send(hash)
			}
		)
		.catch(
			e => {
				raven.captureException(e)
				res.status(500).json({message: 'Woops, something went wrong!'})
			}
		)
})

app.get(/\/(.*)$/, (req, res) => {
	const path = req.params[0]
		.replace(/^\//, '')
		.replace(/\/$/, '')

	if (path.length < config.minSlugLength || !/^[A-Za-z0-9]+$/.test(path)) {
		return res.status(400).json({message: 'Bad Url Slug'})
	}

	client.getAsync(path)
		.then(
			url => {
				if (url == null) {
					res
						.status(404)
						.json({message: 'Slug Not Found'})
				} else {
					res
						.status(301)
						.header("Location", url)
						.send()
				}
			}
		)
		.catch(
			e => {
				raven.captureException(e)
				res.status(500).send({message: 'Woops, something went wrong!'})
			}
		)
		.done()
})

client.getAsync('conf::index')
	.then(
		idx => {
			if (idx == null) {
				index = 1
				return client.setAsync('conf::index', index)
			} else {
				index = parseInt(idx, 10)
				return bluebird.resolve(index)
			}
		},
		e => {
			raven.captureException(e)
			process.exit(2)
		}
	)
	.then(
		() => {
			app.listen(config.port)
			console.log(`Shawtin it up on http://localhost:${config.port}`)
		}
	)
	.catch(e => raven.captureException(e))
	.done()
