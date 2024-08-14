# ODOT 1.0.0

ODOT is a server-client JS web application built with Express. It is a basic todo app that allows users to create an account, which they can later access via the login screen. Upon logging in, users are provided with basic todo app functionalities.

> **FUNCTIONALITIES**
> - create todo
> - check / uncheck todo
> - delete todo
>
> All the todoObjects are saved / removed from the server on creation / deletion, so they will remain there on refresh. 
> 
> The check status of the individual todoObject is also saved on the server so that will be "remembered" on refresh as well (the client sends the check status of all the todoObjects every 1000ms and the server saves that to the database)
>
> Sessions / cookies (active for 1h) are also implemented allowing the user to stay logged in

> **SHORTCUTS (MAIN PAGE '/')**
> - *[CTRL + ENTER]* opens the creation menu (focuses on the input field)
>   - *[ENTER]* create object
>   - *[ESC]* cancel creation
> - *[SHIFT + ENTER]* opens the user menu
> - *[ESC]* to cancel current focus (.blur)
> - *[TAB]* for moving around

## DB

Uses sqlite3 for the database. A simple data base where a user has multiple todoObjects.

> **STRUCTURE**
> - users
>   - userId [P]
>   - username
>   - password
> - todoObjects
>   - todoObjectId [P]
>   - text
>   - checked
>   - userId [F]

## DEPENDENCIES

> **MAIN DEPENDENCIES**
> - *[express & express-sessions]* for the server side and sessions / cookies
> - *[sqlite3]* for the database
> - *[hbs]* for embedding dynamic content into HTML and other benefits

> **DEV DEPENDENCIES**
> - *[nodemon]* for automatically reseting the server on file change
> - *[@types]* for autocompletion

## OTHER
The pre 1.0.0 release commit history is not shown, because this project originally had another repo (that is private and now archived), where the commit history contains sensitive information, thus I made another repository for the commits post 1.0.0.