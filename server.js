// SETUP (1/2)
// ==========================================================================================================================

if (!process.env.PORT)  process.env.PORT = 8080;

// database
    // users - [userId <auto incremented>, username, password]
    // todoObjects - [todoObjectId <auto incremented>, text, checked (1-true, 0-false), userId (FOREIGN KEY, REFERENCED FROM users table)]
const sqlite3 = require(`sqlite3`).verbose();
const db = new sqlite3.Database(`db/users.db`);
db.get("PRAGMA foreign_keys = ON") // sets the foreign key constraint to true (if this wasnt here it would not trigger this constraint)

// server
const express = require(`express`);
const server = express();
server.set(`view engine`, `hbs`); // za dinamically changing (hbs "{")
server.use(express.static(`public`)); // za static (js / css)

const expressSession = require(`express-session`); // for sessions / cookies (da npr. ostane user online on refresh...)
const { request } = require("http");
server.use(expressSession({ // settings za sessions

    secret: "ILoveJava", // key za podpisovanje cookies
    saveUninitialized: true, // shrani novo sejo
    resave: false, // ni treba ponovno shranjevat
    cookie: {

        maxAge: 3600000, // 1h active cookies (so v miliseconds)
    },
}));

// ==========================================================================================================================
// ==========================================================================================================================

// MAIN
// ==========================================================================================================================
// DB FUNCTIONS

// users DB
// =====
const getUserData = (name, cb) => {

    db.all(`SELECT *\
            FROM users\
            WHERE username = "${name}"\
            `, (err, row) => { // if there is an error

                if (err) { // if error, we call the callback with ""

                    cb("", "");
                    console.log(err);
                }
                else {

                    if (row.length > 0) {

                        cb(row[0].userId, row[0].password)
                    }
                    else {

                        cb("", "");
                    }
                }
            });
}

const getUserName = (userId, cb) => {

    db.all(`SELECT *\
            FROM users\
            WHERE userId = ${userId}\
            `, (err, rows) => { // if there is an error

                if (err) { // if error, we call the callback with ""

                    cb("");
                    console.log(err);
                }
                else {

                    cb(rows.length > 0 ? rows[0].username : "");
                }
            });
}

const addNewUser = (name, pass, cb) => {

    db.run(`INSERT INTO users(username, password)\
            VALUES ("${name}", "${pass}")\
            `, (err) => { // if error we catch it and print it to the console

                if (err) { // if error, we call the callback with ""

                    cb(`User ${name} already exists`);
                    console.log(err);
                }
                else {

                    cb("");
                }
            });
}

// =====
// todoObjects DB
// =====

const updateTodoObjectCheckStatus = (todoObjectId, userId, value, cb) => {

    // we update the *checked* value
    db.all(`UPDATE todoObjects\
        SET checked = ${value}\
        WHERE todoObjectId = ${todoObjectId}\
        AND userId = ${userId}\
    `, (err) => {

        if (err) {

            cb("ERROR");
            console.error(err);
        }
        else {

            cb("");
        }
    });
}

const removeTodoObject = (todoObjectId, text, userId, cb) => {

    // we delete the object (has to match all the criteria 
    // <this is for safety, so not anyone can just call this and give a random todoObjectId and thus remove someone elses todoObject>)
    db.all(`DELETE FROM todoObjects\
            WHERE todoObjectId = ${todoObjectId}\
            AND text = "${text}"\
            AND userId = ${userId}\
            `, (err) => {

                if (err) {

                    cb("ERROR");
                    console.error(err);
                }
                else {

                    cb("");
                }
            });
}

const addNewTodoObject = (userId, text, cb) => {  // TODO, pomoje Id nemore povedat starost, zato bo treba creationDate/Time dodat, potem bos tudi lahko po tem gledu myb (kao kot identifier za ta object)
    
    // we insert the new object + get the inserted object Id
    db.all(`INSERT INTO todoObjects(text, checked, userId)\
            VALUES ("${text}", 0, ${userId})\
            RETURNING *
            `, (err, rows) => {

                if (err) { // if there is an error we print it to the console and give the error in the callback

                    cb(err, "");
                    console.log(err);
                }
                else {

                    cb("", rows[0].todoObjectId);
                }
            });
}

const getAllTodoObjects = (userId, cb) => {

    db.all(`SELECT *\
            FROM todoObjects\
            WHERE userId = "${userId}"\
            `, (err, rows) => {

                if (err) {

                    cb("");
                    console.log(err);
                }
                else {

                    if (rows && rows.length > 0) {

                        cb(rows);
                    }
                    else {

                        cb("");
                    }
                }
            });
}

// ==========================================================================================================================
// HELPER FUNCTIONS

const checkName = (name) => {

    if (name.length < 3 ||
        name.length > 20 ||
        !/^[!-~]+$/.test(name) // check for non-ascii (not from 33-126) characters, is true if there are any
    )  return false;
    return true;
}

const checkPass = (pass) => {

    if (pass.length < 8 ||
        pass.length > 50 ||
        !/\d/.test(pass) ||           // checks for number (0 - 9)
        pass == pass.toLowerCase() || // checks for upper case character
        !/^[!-~]+$/.test(pass)        // check for non-ascii (not from 33-126) characters, is true if there are any
    )  return false;
    return true;
}

const syncTodoObjects = (statusJson, userId, cb) => {

    // we iterate through the objects in the JSON, and set it to the coresponding value
    let error = "";

    const promises = []; // array, ki holda promises od for loopa

    for (key in statusJson) { // TODO: mogoce bo treba revampat enkrat, ker zdaj gre cez vse todoObjects
                              // ker for loop gre zlo hitro cez in kreira Promises za vse te objects
                              // torej se caka za vse te promises da se resolvajo

                              // mogoc, da nimas promises alpa kej. Ce dodas zgoraj na for loopu npr:
                              // if (error != "")  break
                              // potem nebo delalo, saj for loop ze zdavnaj gre cez vse iteracije in
                              // kreira Promises

                              // usaj figuru sem out, da dela. Za zdj je fine

        let value = (statusJson[key]) ? 1 : 0;

        promises.push(new Promise(resolve => { // naredimo promise za ta object
            
            updateTodoObjectCheckStatus(key, userId, value, (err) => {

                // console.log("START"); // ZA DEBUG
                if (err) {

                    error = "ERROR"
                }

                resolve();
            });
        }));
    }

    Promise.all(promises).then(() => { // pocakamo, da so vse promises fuffilled, potem se to runa

            // console.log("END" + error); // ZA DEBUG

            cb(error);
        });
}

// ==========================================================================================================================
// DEV FUNCTIONS

server.get(`/dev/testSQL`, (request, response) => {

    // TODOOBJECTS TABLE
    // =====
    // CREATES THE TABLE
    // db.run(`CREATE TABLE todoObjects(\
    //         todoObjectId INTEGER PRIMARY KEY,\
    //         text,\
    //         checked INTEGER,\
    //         userId INTEGER,
    //         FOREIGN KEY(userId) REFERENCES users(userId)
    //         )`);

    // INSERTS A TEST TODOOBJECT (ROW)
    // db.run(`INSERT INTO todoObjects(text, checked, userId)\
    //         VALUES ("test", "0", "1")`, (error) => { // if error we catch it and print it to the console

    //             if (error) return console.error(error.message);
    //         });

    // DELETES ALL TODOOBJECTS (ROWS)
    // db.run(`DELETE FROM todoObjects\
    //         `, (err) => {

    //             if (err)  return console.error(err.message);
    //         });

    // DELETES ALL TODOOBJECTS OF A USER (ROWS)
    // db.run(`DELETE FROM todoObjects\
    //         WHERE userId = 2\
    //         `, (err) => {

    //             if (err)  return console.error(err.message);
    //         });

    // SHOW TABLE (todoObjects)
    db.all(`SELECT * FROM todoObjects`, (err, rows) => {

        rows.forEach(row => {
            console.log(row);
        });
    });

    // =====
    // USERS TABLE
    // =====
    // CREATES THE TABLE
    // db.run(`CREATE TABLE users(\
    //         userId INTEGER PRIMARY KEY,\
    //         username UNIQUE,\
    //         password\
    //         )`);

    // DROPS TABLE
    // db.run(`DROP TABLE users`);

    // INSERTS A TEST USER (ROW)
    // db.run(`INSERT INTO users(username, password)\
    //         VALUES ("domen2", "gase")`, (error) => { // if error we catch it and print it to the console

    //             if (error) return console.error(error.message);
    //         });

    // DELETES ALL USERS (ROWS) WHERE userId=2
    // db.run(`DELETE FROM users\
    //         WHERE userId = 2`, (err) => {

    //             if (err)  return console.error(err.message);
    //         });

    // SHOW TABLE (users)
    db.all(`SELECT * FROM users`, (err, rows) => {

        rows.forEach(row => {
            console.log(row);
        });
    });

    // =====

    response.send(`GOOD`);
});

server.get(`/dev/sessions`, (request, response) => {

    request.sessionStore.all((err, sessions)=> {

        response.send(sessions);
    });
});

// ==========================================================================================================================
// MAIN PAGE FUNCTIONS

// prikaz main page
server.get(`/`, (request, response) => {

    if (!request.session.customerId) { // if the user is not loged in, we redirect to the login page
                                       // we give the request.sessoin.customer a value on login

        response.redirect(`/login`);
    }
    else { // if the user is loged in we render the main page

        getUserName(request.session.customerId, (name) => {

            getAllTodoObjects(request.session.customerId, (rows) => {

                response.render(`index`, {

                    userName: name,
                    listOfTodoObjects: rows
                });
            });
        });
    }
});

// creates a new todo object and sends all the users todo objects
server.get(`/action/createTodoObject/:newObjectJson`, (request, response) => {

    newObjectJson = JSON.parse(request.params.newObjectJson);

    // damo nov object v database ter posljemo nazaj ce je bil error
    addNewTodoObject(request.session.customerId, newObjectJson.text, (err, todoObjectId) => {

        let json = JSON.stringify(
            {   
                "err": err,
                "todoObjectId": todoObjectId
            }
        );

        response.send(json);
    });
});

// ERROR HANDLER CE JE SLUCAJNO ERROR
server.use(function (err, req, res, next) {
    console.error(err);
    res.status(err.status || 500).json({status: err.status, message: err.message})
});

server.get(`/action/removeTodoObject/:objectJson`, (request, response) => {

    objectJson = JSON.parse(request.params.objectJson);

    removeTodoObject(objectJson.todoObjectId, objectJson.text, request.session.customerId, (err) => {

        let json = JSON.stringify(
            {   
                "err": err
            }
        );

        response.send(json);
    });
});

server.get(`/action/todoObjectsStateUpdate/:statusJson`, (request, response) => {

        statusJson = JSON.parse(request.params.statusJson);

        syncTodoObjects(statusJson, request.session.customerId, (err) => {

            json = JSON.stringify(
                {
                    "err": err
                }
            );
            response.send(json);
        });
});

// ==========================================================================================================================
// LOGIN / SIGNUP / LOGOUT FUNCTIONS

// prikaz login page
server.get(`/login`, (request, response) => {

    // if the client is already logged in
    if (request.session.customerId) {

        response.redirect(`/`);
        return;
    }

    if (request.query.error) { // if there was a login error we display it

        response.render(`login`, {

            loginMessage: `${request.query.error}`
        }); 
    }
    else {

        response.render(`login`);
    }
});

// user action: login | redirection
server.get(`/action/login/:loginJson`, (request, response) => {

    // if the client is already logged in
    if (request.session.customerId) {

        response.redirect(`/`);
        return;
    }

    loginJson = JSON.parse(request.params.loginJson);

    // if the any input field is empty we redirect to login page with an error
    if (loginJson.name == "" || loginJson.pass == "") {

        response.redirect(`/login?error=` + encodeURIComponent(`Fill all input fields`));
        return;
    }

    // we check if the customer exists
    getUserData(loginJson.name, (userId, pass) => {

        if (userId == "") { // if the account does not exists we redirect to login page with an error

            response.redirect(`/login?error=` + encodeURIComponent(`Account does not exist`));
        }
        else if (loginJson.pass != pass) { // if the password is incorrect we redirect to login page with an error

            response.redirect(`/login?error=` + encodeURIComponent(`Incorrect password`))
        }
        else { // if the userId exists we log the user in and redirect to main page

            request.session.customerId = parseInt(userId);
            response.redirect(`/`);
        }
    });
});

// user action: logout | redirection
server.get(`/action/logout`, (request, response) => {

    request.session.destroy();
    response.redirect(`/login`);
});

// prikaz signup page
server.get(`/signup`, (request, response) => {

    // if the client is already logged in
    if (request.session.customerId) {

        response.redirect(`/`);
        return;
    }

    if (request.query.error) { // if there was a signup error we display it

        response.render(`signup`, {

            signupMessage: `${request.query.error}`
        }); 
    }
    else {

        response.render(`signup`);
    }
});

// user action: sign up | redirection
server.get(`/action/signup/:signupJson`, (request, response) => {

    // if the client is already logged in
    if (request.session.customerId) {

        response.redirect(`/`);
        return;
    }

    signupJson = JSON.parse(request.params.signupJson);

    // if the any input field is empty we redirect to login page with an error
    if (signupJson.name == "" || signupJson.pass == "") {

        response.redirect(`/signup?error=` + encodeURIComponent(`Fill all input fields`));
        return;
    }

    // we check that name and password are within the boundaries
    // BOUNDARIES (range):
    //      name: [3, 20] + ASCII(33-126)
    //      pass: [8, 50] + 1x number + 1x UpperCase + ASCII(33-126)
    if (!checkName(signupJson.name)) { // we redirect back to signup with an error message

        response.redirect(`/signup?error=` + encodeURIComponent(`Name has to be within 3 and 20 characters (ASCII 33 - 126) long`));
        return;
    }
    else if (!checkPass(signupJson.pass)) {

        response.redirect(`/signup?error=` + encodeURIComponent(`Password has to be within 8 and 50 characters (ASCII 33 - 126) long\
                                                                and has to include a number and an upper case character`));
        return;
    }

    addNewUser(signupJson.name, signupJson.pass, (errMessage) => {

        if (errMessage == "") { // if the account was successfuly created we redirect to login that logs him in

            let loginJson = JSON.stringify(
                {   
                    "name" : signupJson.name,
                    "pass" : signupJson.pass
                }
            );
            response.redirect(`/action/login/` + loginJson);
        }
        else { // else we redirect to signup with an error message

            response.redirect(`/signup?error=` + encodeURIComponent(errMessage));
        }
    });
});

// ==========================================================================================================================
// ==========================================================================================================================

// SETUP (2/2)
// ==========================================================================================================================

server.listen(process.env.PORT, () => {

    console.log(`Server is running on ${process.env.PORT}`);
})