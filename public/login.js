$(document).ready(() => {

    $(`#loginButton`).on(`click`, () => {

        let loginJson = JSON.stringify(
            {   
                "name" : $(`#name`).val(),
                "pass" : $(`#pass`).val()
            }
        );
        
        window.location = `/action/login/` + loginJson; // window.location se uporablja, ce redirectas potem na serverju
    });

    $(document).on(`keypress`, function(e) {
        
        if ((e.keyCode == 10 || e.keyCode == 13)) { // 13 - Enter button

            document.getElementById(`loginButton`).click();
        }
    });
});