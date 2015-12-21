# Shawt
A leveldb backed link shortener

##How-to

1. Clone/Download the repository
2. Go into the folder it was cloned/extracted to
3. Run `npm install`
4. Make a copy of 'config.example.js' called 'config.js'
5. Replace the default values in 'config.js'
6. Either run `npm start` or use your favourite manager (forever, pm2, etc)
7. Connect to your server and start making things shorter!

There are three urls exposed by shawt-server:

`GET example.com/<shortcode>` - will return either a 301 and a Location, or a 404 if the short code isn't in the DB

`GET example.com/` - Presents an interface for creating short links

`POST example.com/` - Request body must contain a "url" key/value pair, it will be stored in the database and the generated shortcode will be returned

