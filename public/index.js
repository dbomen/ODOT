// HELPER FUNCTIONS
// ===
// CHECK STATUS
let getChecksStatusJson = (cb) => { // cb = JSON of the check status of todoObjects

    let objectJson = {};
    $(`#todoObjectsList`).children(`*`).each(function (ix) {

        objectJson[$(this).attr(`id`)] = $(this)[0].childNodes[1].checked;
    });

    cb(objectJson);
}

// ADD TODO OBJECT
const addNewTodoObject = (text, todoObjectId) => {

    $(`#todoObjectsList`).append(

        `<div id="${todoObjectId}" class="todoObject">
            <input type="checkbox" class="flexItem">
            <span id="text" class="flexItem">${text}</span>
            <button class="flexItem"><i class="fa-solid fa-x"></i></button>
            <span id="objectErrorMessage" class="flexItem"></span>
        </div>`
    );
}

// DOCUMENT READY
// ===
$(document).ready(() => {

    $(`#mainPageLink`).css(`color`, `whitesmoke`); // da se "prizge" ta div

    $(`#logoutButton`).on(`click`, () => {
        
        window.location = `/action/logout`; // window.location se uporablja, ce redirectas potem na serverju
    });

    $(`#addTodoObjectStarterButton`).on(`click`, () => {

        $(`#addTodoObjectStarterButton`).hide();
        $(`#cancelAction`).show();
        $(`#addObjectErrorMessage`).text("");
        $(`#addTodoObjectInputField`).show();
        $(`#addTodoObjectButton`).show();

        // we want it to focus on the input field
        let inputField = document.getElementById(`addTodoObjectInputField`);
        inputField.focus();
        inputField.scrollIntoView();
    });

    // DOCUMENT SHORTCUTS
    $(document).on(`keypress`, function(e) {

        // SHIFT + ENTER - focuses on user drop down menu
        if ((e.keyCode == 10 || e.keyCode == 13) && e.shiftKey) {

            document.getElementById(`userButton`).focus();
        }
        
        // CTRL + ENTER - goes to todo object creation screen
        else if ((e.keyCode == 10 || e.keyCode == 13) && (e.ctrlKey || e.metaKey)) { // 13 - Enter button

            document.getElementById(`addTodoObjectStarterButton`).click();
        }
    });

    // FOR SOME REASON keyCode == 27, does not work on ".on(`keypress`)"
    $(document).keydown(function(e){

        // ESC - *hides* ce je kej odprt (za zdej je samo da cancela action FIXME:)
        if (e.keyCode == 27) {

            document.getElementById(`cancelAction`).click();
            document.activeElement.blur();
        }
    });

    // TODOOBJECT CREATION SHORTCUTS
    $(`#addTodoObjectInputField`).on(`keypress`, function(e) {

        // ce pisemo sem noter in ENTER, je to shortcut da hoces creatat todoObject
        if ((e.keyCode == 10 || e.keyCode == 13)) {

            document.getElementById(`addTodoObjectButton`).click();
        }
    });

    // CREATE TODO ACTION
    $(`#addTodoObjectButton`).on(`click`, () => {

        let text = $(`#addTodoObjectInputField`).val()
        let json = JSON.stringify(
            {   
                "text": text
            }
        );

        $.get(`/action/createTodoObject/` + json, (returnJson) => {

            returnJson = JSON.parse(returnJson);

            if ((returnJson.err && returnJson.err != "")) { // if there was an error we display it

                console.log(returnJson.err);
                $(`#addObjectErrorMessage`).text("Error, did not create");
                return;
            }

            addNewTodoObject(text, returnJson.todoObjectId);
            console.log(`ADDED TODO OBJECT: id=${returnJson.todoObjectId}`);
        }).fail((jqXHR, textStatus, errorThrown) => {

            console.error(`Request failed: ${textStatus}, ${errorThrown}`);
            $(`#addObjectErrorMessage`).text(`Error, did not create. Server error (status: ${jqXHR.status}).`);
        });

        $(`#addTodoObjectStarterButton`).show();
        $(`#cancelAction`).hide();
        $(`#addTodoObjectInputField`).hide();
        $(`#addTodoObjectInputField`).val("");
        $(`#addTodoObjectButton`).hide();
    });

    // CANCEL TODO ACTION
    $(`#cancelAction`).on(`click`, function () {

        $(`#addTodoObjectStarterButton`).show();
        $(`#cancelAction`).hide();
        $(`#addTodoObjectInputField`).hide();
        $(`#addTodoObjectInputField`).val("");
        $(`#addTodoObjectButton`).hide();
    });

    // DELETE TODO ACTION
    $(`#todoObjectsList`).on(`click`, `.todoObject button`, function () { // ALERT THIS IS A RANT:
                                                                        // I LOST 1h BECAUSE IF I DID $(this).parent().attr("id") while using |... .on(`click`, () => { ...|
                                                                        // so callback like, nothing worked and it did not register the object!!!! 
                                                                        // And then I very doubtedly, "surely this is not it, that makes no sense", 
                                                                        // changed it to |... .on(`click`, function () { ...| and it worked!! WHY!!!!!!

                                                                        // UPDATE 1:
                                                                        // so I did some research (5min on google) and saw that arrow functions and "normal" functions
                                                                        // treat the word *this* differently (but why). Apparently arrow functions are just objectivly worse,
                                                                        // and are only good for "more concise code". In arrow functions *this* would point to 
                                                                        // what *this* was before the function was created.

        // also I have to use *event delegation*, because I'm dinamically creating the todoObject (with .todoObject). So I have to *delegate* the ".todoObject button".
        // the only thing that can stay in the $(`*thing*`) is the thing that is not dinamically created.

        let id = $(this).parent().attr("id");
        let text = $(`#${id} #text`).text();
        let json = JSON.stringify(
            {   
                "todoObjectId": id,
                "text": text,
            }
        );

        $(`#${id} #objectErrorMessage`).text(""); // ce je bil prej slucajno error message, ga zdaj resetamo

        $.get(`/action/removeTodoObject/` + json, function (returnJson) {

            returnJson = JSON.parse(returnJson);

            if (returnJson.err != "") { // if there is an error we dont remove it

                console.log(returnJson.err);
                $(`#${id} #objectErrorMessage`).text("Error, did not remove");
                return;
            }

            $(`#${id}`).remove();
            console.log(`REMOVED TODO OBJECT: id=${id}`);
        });
    });
    
    // vsake 3 sekunde poslemo serverju trenutno stanje todoObjecta 
    // 1: (checked / unchecked)
    window.setInterval(function () {

        getChecksStatusJson((checksStatusJson) => {

            checksStatusJson = JSON.stringify(checksStatusJson);

            // TODO: ce bos hotu se kej da se posilja tako, dodej se en callback ig (ker bo treba pac data dobit, kar traja mora bit async)
            
            $.get(`/action/todoObjectsStateUpdate/` + checksStatusJson, function (returnJson) {

                returnJson = JSON.parse(returnJson);

                if (returnJson.err != "") { // if there was an error we display it

                    console.log(returnJson.err);
                    $(`#addObjectErrorMessage`).text("Error, checked status not updated");
                    return;
                }

                console.log(`UPDATED CHECK STATUS`);
            });
        });
    }, 1000);
});