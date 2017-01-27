// Loading server modules
var express = require('express');
var https = require('https');

// Loading utilities modules
var bodyParser = require('body-parser');
var stringifyObject = require('stringify-object');
var stripOuterParens = require('strip-outer-parens');
var isJSON = require('is-json');
var cfenv = require('cfenv');

// Server Creation
var app = express();

// Server Initialization
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
var appEnv = cfenv.getAppEnv();

// Server Startup
app.listen(appEnv.port, appEnv.bind, function() {
    console.log("-- ExtraEntry -- Server starting on " + appEnv.url);
});

// Database Initialization
var cloudant;
var db;
var dbCredentials = {
	dbName : 'teauserview'
};

function initDBConnection() {
    if(process.env.VCAP_SERVICES) {
        var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
        if(vcapServices.cloudantNoSQLDB) {
            dbCredentials.host = vcapServices.cloudantNoSQLDB[0].credentials.host;
            dbCredentials.port = vcapServices.cloudantNoSQLDB[0].credentials.port;
            dbCredentials.user = vcapServices.cloudantNoSQLDB[0].credentials.username;
            dbCredentials.password = vcapServices.cloudantNoSQLDB[0].credentials.password;
            dbCredentials.url = vcapServices.cloudantNoSQLDB[0].credentials.url;
        }
        console.log("-- ExtraEntry -- CloudantNoSQL initialized");
        console.log("-- ExtraEntry -- VCAP Services: " + JSON.stringify(process.env.VCAP_SERVICES));
 
        // Use the Cloudant Node.js module as a database client
        cloudant = require('cloudant')(dbCredentials.url);

        // Check if the DB exists. If not create it.
        cloudant.db.create(dbCredentials.dbName, function (err, res) {
            if (err) { console.log("-- ExtraEntry -- Could not create the Cloudant database", err); }
        });

        db = cloudant.use(dbCredentials.dbName);
    }
}

initDBConnection();

// Function to insert records into the Cloudant NoSQL DB
function updateDB(document, database, retFunc) {
	
	// Define a random record ID for the data insertion
	var recId = Math.floor((Math.random() * 1000000) + 1);

	// Insert the document into the database
	database.insert(document, recId, function(err) {
		if (err) {
			retFunc('-- ExtraEntry --  Could not insert document into DB with error: ' + err.message);
		}
		else {
			retFunc('-- ExtraEntry --  Document inserted into the DB successfully');
		}
	});
}

// Routes Definition
app.post('/', function (req, res) {
    var ReqJSON = JSON.stringify(req.body);
    var ReqBody = req.body;
    var ReqContentType = req.get('Content-Type');
    var ReqHeadersFormatted = stringifyObject(req.headers, {indent:'\t\t\t', singleQuotes: false});
    var ReqHeadersFormattedStripped = stripOuterParens(ReqHeadersFormatted);
    var isValidJSON = isJSON(ReqJSON);

	var MyRes = `Web Server is running and listening at ${appEnv.url}\n\nRequest\n\tUrl:\t${req.url}\n\tMethod:\t${req.method}\n\tHeaders:\t${ReqHeadersFormattedStripped}\tContent-Type:\t${ReqContentType}\n\tBody:\t${ReqJSON}\n\tIs valid JSON:\t${isValidJSON}\n\nResponse\n\tStatus Code:\t${res.statusCode}`;
	
	// Insert the Request Body into the Cloudant NoSQL DB
	if (ReqBody) {
		updateDB(ReqBody, db, function(mess) {
			console.log(mess);
		});
	}
    return res.send(`${MyRes}`);
});

app.get('/', function (req, res) {
    res.header('Content-type', 'text/html');
    return res.end(`Web Server is running and listening at ${appEnv.url}`);
});

app.get('/data', function (req, res) {
    var docList = [];
    var i = 0;

    db.list(function(err, body) {
        if (!err) {
            var len = body.rows.length;
            console.log('-- ExtraEntry -- Total number of documents in the ' + dbCredentials.dbName + ' database: ' + len);
            if(len > 0) {
                // Loop through all the DB documents
                body.rows.forEach(function(document) {
                    db.get(document.id, { revs_info: true }, function(err, doc) {
                        if (!err) {
                            docList.push(doc);
                        }
                        else {
                            return console.log(err);
                        }
                        i++;
                        if(i >= len) {
                            return res.send(JSON.stringify(docList));
                        }
                    });
                });
            } else {
                console.log('-- ExtraEntry -- The ' + dbCredentials.dbName + ' database is empty');
                return res.send([]);
            }
        } else {
            return console.log(err);
        }
    });
});
