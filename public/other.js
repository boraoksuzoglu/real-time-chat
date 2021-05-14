const scrolldown = document.getElementById("scrolldown")

function scrollFunc() {
    if (Number(document.getElementById("messages").scrollTop + document.getElementById("messages").clientHeight) == document.getElementById("messages").scrollHeight) {
        scrolldown.style.display = "none"
        scrolldown.classList.remove("animate__delay-2s")
    } else {
        scrolldown.style.display = "block"
        if (scrolldown.classList.contains("animate__bounce")) {
            scrolldown.classList.remove("animate__bounce")

        }
    }
}

//

document.getElementById("users").style.maxHeight = `${document.getElementById("users").childNodes[1].clientHeight * 4}px`