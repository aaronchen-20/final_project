const express = require("express");
const readline = require("readline");
const path = require('path');
const fs = require('fs');
const portNumber = process.argv[2];
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
const { error } = require("console");

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:false}));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.listen(portNumber)
console.log(`Web server is running at http://localhost:${portNumber}`);

const linereader = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

linereader.setPrompt('Stop to shutdown the server: ');
linereader.prompt();
linereader.on("line", (input) => {
    if (input === "stop") {
        console.log("Shutting down the server");
        linereader.close();
        process.exit(0);

    } else {
        console.log(`Invalid command: ${input}`);
        linereader.prompt()
    }
})

/// mongo stuff
require("dotenv").config({ path: path.resolve(__dirname, 'creds/.env') })
const username = process.env.MONGO_DB_USERNAME
const password = process.env.MONGO_DB_PASSWORD
const database = process.env.MONGO_DB_NAME
const collection = process.env.MONGO_COLLECTION
const uri = `mongodb+srv://${username}:${password}@cluster0.4wuv7en.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1 });

async function getImageFromApi() {
    try {
        const response = await fetch('https://dog.ceo/api/breeds/image/random');
        const img = await response.json();
        return img.message
    } catch (error) {
        console.error('Error:', error);
        return '';
    }
}
async function insertPerson(client, app) {
    await client.db(database).collection(collection).insertOne(app)
}

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/quiz", (req, res) => {
    res.render("quiz");
});

app.post("/quizFinished", async (req, res) => {
    let score = 0
    if (req.body.q1 === "Help them pick up their books") {
        score++;
    } else if (req.body.q2 === "Laugh at them") {
        score--;
    }

    if (req.body.q2 === "Start it today, get it over with fast.") {
        score++;
    } else if (req.body.q2 === "Do it the day before") {
        score--;
    }

    if (req.body.q3 === "brave") {
        score++;
    } else if (req.body.q3 === "cunning") {
        score--;
    }

    let house = ""
    if (score >= 2) {
        house = "gryffindor"
    } else if (score >= 0) {
        house = "ravenclaw"
    } else if (score >= -2) {
        house = "hufflepuff"
    } else {
        house = "slytherin"
    }

    quizApp = {name: req.body.username, house: house}
    /// 3,2 gryffindor 1,0 ravenclaw 0 muggle -1 hufflepuff -2,-3 slytherin
    try {
        await client.connect()
        await insertPerson(client, quizApp)
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }

    variables = {
        house: house,
        image: await getImageFromApi()
    }

    res.render("picked.ejs", variables);
    
})

app.get("/list", async (req, res) => {
    let msg = ""
    let filter = {name: {$ne: ""}}

    try {

        await client.connect()
        const list = await client.db(database).collection(collection).find(filter).toArray()
        list.forEach(elt => {
            msg += `${elt.name} is in ${elt.house}<br>`
        })
    } catch(err) {
        console.error(error)
    } finally {
        await client.close()
    }
    variables = {fullList: msg}
    res.render("list", variables);
})

app.get("/del", async (req, res) => {
    try {
        await client.connect()
        await client.db(database).collection(collection).deleteMany({});
        
    } catch (err) {
        console.error(error);
    } finally {
        await client.close()
    }

    res.render("list", {fullList: "All things in DB have been deleted"});
})

