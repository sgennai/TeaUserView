// Loading server modules
var express = require('express');
var app = express();
var https = require('https');

// Loading utilities modules
var bodyParser = require('body-parser');
var stringifyObject = require('stringify-object');
var stripOuterParens = require('strip-outer-parens');
var isJSON = require('is-json');
var cfenv = require("cfenv");

// Initialization
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
var appEnv = cfenv.getAppEnv();

// Creation of the server
app.listen(appEnv.port, appEnv.bind, function() {
    console.log("server starting on " + appEnv.url);
});

// Defining routes
app.get('/', function (req, res) {
    res.header('Content-type', 'text/html');
    return res.end(`Web Server is running and listening at ${appEnv.url}`);
});

app.post('/', function (req, res) {
    var ReqJSON = JSON.stringify(req.body);
    var ReqContentType = req.get('Content-Type');
    var ReqHeadersFormatted = stringifyObject(req.headers, {indent:'\t\t\t', singleQuotes: false});
    var ReqHeadersFormattedStripped = stripOuterParens(ReqHeadersFormatted);
    var isValidJSON = isJSON(ReqJSON);

	var MyRes = `Web Server is running and listening at ${appEnv.url}\n\nRequest\n\tUrl:\t${req.url}\n\tMethod:\t${req.method}\n\tHeaders:\t${ReqHeadersFormattedStripped}\tContent-Type:\t${ReqContentType}\n\tBody:\t${ReqJSON}\n\tIs valid JSON:\t${isValidJSON}\n\nResponse\n\tStatus Code:\t${res.statusCode}`;
    return res.send(`${MyRes}`);
});
