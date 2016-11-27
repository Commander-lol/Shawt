# Shawt
A tiny link shortener backed by a redis store

## Setting It Up

You'll need a few things to run Shawt:

- A server with nodejs 6.x.x to host it on
- A Redis instance for which you can obtain a connection string (and optionally a password)
- A [Sentry](https://sentry.io/) account (It's free, but will be optional in future releases)

With all that in hand, let's get going!

1. Clone this repo, download a release or otherwise obtain a copy of Shawt
2. In the Shawt folder, create a copy of `config.example.json` called `config.json`
3. Fill in the details needed in `config.json` (refer to the table below for info)
4. Spin up an instance using your favourite app manager, or just `npm start` or even `node shawt`

## Usage

You can create shortened links programmatically by sending a `PUT` request to the `/` endpoint with the following 
`JSON` encoded body:

param |  type  | description
------|--------|-------------
 url  |`String`| The url to be shortened
 
 The response will be the `plain/text` encoded url slug. With default configuration, it will literally just be
 the four characters that go on the end of the url. It's up to your client code to format or store that correctly
 (This allows a smart client to handle any unforseen changes that would affect the domain being used e.g. change
 to the app's mount path, or even domain changes)
 
 Sending a `GET` request to the `/:slug` endpoint will return one of the following response types:
 
 code | when | description
 ---|---|---
 `301`|The `:slug` exists in the db | Contains a `Location` header with the redirect target
 `400`|The `:slug` contains invalid characters | 
 `404`|The `:slug` was not found in the database |
 `500`|Something went wrong with a database call |

### `config.json`

Key | type | description
---|---|---
`port` | `number` | The port for the server to listen to
`salt` | `string` | The salt used when generating the non-sequential url slug
`alphabet` | `string` | The set of characters allowed in the slug. defaults to `[a-zA-Z0-9]`
`dbpath` | `string` | The connection string for your redis server
`dbpass` | `string` | The password for your redis server, if it is password protected
`raven` | `string` | Your sentry.io connection string
`minSlugLength` | `number` | The minimum length of the url slug to generate; the length will grow once the current size is exhausted
