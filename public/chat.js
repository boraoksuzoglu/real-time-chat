const socket = new WebSocket('ws://localhost:3000');
socket.addEventListener('open', function (event) {
    socket.send(JSON.stringify({
        type: "login",
        data: {
            chat: document.getElementById("chat").innerHTML,
            user: document.getElementById("userToken").innerHTML
        }
    }))
    
});

socket.addEventListener("message", function (data) {

    const jsonData = JSON.parse(data.data)
    const messageBox = document.getElementById("messages")
    if (jsonData.type == "join") {
        messageBox.innerHTML += `
                <div class="msg col-12" style="text-align: center;">
                <div class="msgbox col-9" style="background-color: rgba(${jsonData.data.color['r']}, ${jsonData.data.color['g']}, ${jsonData.data.color['b']}, 0.1);">
                    <p><strong>${jsonData.data.username}</strong> joined the chat.</p>
                </div>
            </div>`

        document.getElementById("users").innerHTML += `<li class="user_element" style="background-color: rgba(${jsonData.data.color['r']}, ${jsonData.data.color['g']}, ${jsonData.data.color['b']}, 0.1);">
            <div class="profile mini-profile" style="background-color: rgba(${jsonData.data.color['r']}, ${jsonData.data.color['g']}, ${jsonData.data.color['b']}, 1);">
                <img src="../public/profile.png" width="80px" alt="">
            </div>
            <p>${jsonData.data.username}</p>
        </li>`

        document.getElementById("users").style.maxHeight = `${document.getElementById("users").childNodes[1].clientHeight * 4}px`
        document.getElementById("totalUsers").innerText = Number(document.getElementById("totalUsers").innerText) + 1

    } else if (jsonData.type == "leave") {
        messageBox.innerHTML += `
                <div class="msg col-12" style="text-align: center;">
                <div class="msgbox col-9" style="text-align: center; background-color: rgba(${jsonData.data.color['r']}, ${jsonData.data.color['g']}, ${jsonData.data.color['b']}, 0.1);">
                    <p><strong>${jsonData.data.username}</strong> left the chat.</p>
                </div>
            </div>`
        
        document.querySelectorAll(".user_element").forEach(element => {
            if (element.lastElementChild.innerHTML == jsonData.data.username) {
                element.remove()
            }
        })

        document.getElementById("users").style.maxHeight = `${document.getElementById("users").childNodes[1].clientHeight * 4}px`
        document.getElementById("totalUsers").innerText = Number(document.getElementById("totalUsers").innerText) - 1

    } else if (jsonData.type == "message") {
        var author = HTMLUtils.escape(jsonData.data.author.username)
        var message = HTMLUtils.escape(jsonData.data.message)
        
        if (jsonData.data.oppo) {

            const newMessage = document.createElement("div")

            newMessage.innerHTML = `<div class="msg col-12 animate__animated animate__fadeInLeft">
                    <div class="profile mini-profile col-2 oppo" style="background-color: rgba(${jsonData.data.author.color['r']}, ${jsonData.data.author.color['g']}, ${jsonData.data.author.color['b']}, 1);">
                        <img src="../public/profile.png" width="80px" alt="">
                    </div>
                    <div class="msgbox col-9" style="background-color: rgba(${jsonData.data.author.color['r']}, ${jsonData.data.author.color['g']}, ${jsonData.data.author.color['b']}, 0.1);">
                        <p id="username" style="color: rgba(${jsonData.data.author.color['r']}, ${jsonData.data.author.color['g']}, ${jsonData.data.author.color['b']}, 1);">${author}</p>
                        <p>${message}</p>
                     </div> 
                </div>`
            messageBox.appendChild(newMessage)
            newMessage.addEventListener('animationend', () => {
                newMessage.classList.remove("animate__fadeInLeft")
            });

        } else {
            const newMessage = document.createElement("div")
            newMessage.innerHTML = `
                <div class="msg col-12 animate__animated animate__fadeInRight" style="text-align: right;">

                <div class="msgbox col-9" style="background-color: rgba(${jsonData.data.author.color['r']}, ${jsonData.data.author.color['g']}, ${jsonData.data.author.color['b']}, 0.1);">
                    <p id="username" style="color: rgba(${jsonData.data.author.color['r']}, ${jsonData.data.author.color['g']}, ${jsonData.data.author.color['b']}, 1);">${author}</p>
                    <p>${message}</p>
                </div>
                <div class="profile mini-profile col-2 self" style="background-color: rgba(${jsonData.data.author.color['r']}, ${jsonData.data.author.color['g']}, ${jsonData.data.author.color['b']}, 1);">
                    <img src="../public/profile.png" width="80px" alt="">
                </div>

                </div>`
            newMessage.addEventListener("animationend", () => {
                newMessage.classList.remove("animate__fadeInRight")
            })
            messageBox.appendChild(newMessage)
            document.getElementById("messages").scrollTo(0, document.getElementById("messages").scrollHeight);

        }

    }

    if (jsonData.type == "join" || jsonData.type == "leave" || jsonData.type == "message" && jsonData.data.oppo) {
        const scrolldown = document.getElementById("scrolldown")
        const allMessages = document.querySelectorAll(".msg")
        if (Number(messageBox.scrollHeight - messageBox.clientHeight - messageBox.scrollTop) < allMessages[allMessages.length-1].clientHeight + allMessages[allMessages.length-2].clientHeight) {
            document.getElementById("messages").scrollTo(0, document.getElementById("messages").scrollHeight);
            scrolldown.style.display = "none"
            scrolldown.classList.remove("animate__delay-2s")
        } else {
            scrolldown.style.display = "block"
            scrolldown.classList.add("animate__bounce")
            scrolldown.addEventListener("animationstart", () => {
                scrolldown.classList.add("animate__delay-2s")
            })
        }
    }

})

document.getElementById("message").addEventListener("keyup", function (event) {
    if (event.key == "Enter") {
        event.preventDefault();
        document.getElementById("sendmsg").click();
    }
});

document.getElementById("sendmsg").onclick = () => {

    socket.send(JSON.stringify({
        type: "message",
        data: {
            message: document.getElementById("message").value,
            token: document.getElementById("userToken").innerHTML
        }
    }))
    document.getElementById("message").value = ""

}

document.getElementById("logout").onclick = async () => {

    await fetch("/logout", {method: "POST"})
    location.reload()
}

document.getElementById("scrolldown").onclick = () => {

    document.getElementById("messages").scrollTo(0, document.getElementById("messages").scrollHeight);

}

var HTMLUtils = new function () {
    var rules = [{
            expression: /&/g,
            replacement: '&amp;'
        },
        {
            expression: /</g,
            replacement: '&lt;'
        },
        {
            expression: />/g,
            replacement: '&gt;'
        },
        {
            expression: /"/g,
            replacement: '&quot;'
        },
        {
            expression: /'/g,
            replacement: '&#039;'
        }
    ];

    this.escape = function (html) {
        var result = html;

        for (var i = 0; i < rules.length; ++i) {
            var rule = rules[i];

            result = result.replace(rule.expression, rule.replacement);
        }

        return result;
    }
};