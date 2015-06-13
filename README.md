# shawt-server
A leveldb backed link shortener

##How-to

1. Clone/Download the repository
2. Go into the folder it was cloned/extracted to
3. run `npm install`
4. Either run `node shawt` or use your favourite manager (forever, pm2, etc)
5. Access the API at localhost:7890

There are two urls exposed by shawt-server:

`GET example.com/<shortcode>` - will redirect to the appropriate page or return a 404 JSON object

`POST example.com/api` - Request body must contain a "link" key/value pair, it will be stored in the database and the generated shortcode will be returned
