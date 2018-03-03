let chat_dict = {};
let ticker;

function handleClientLoad()
{
    // Loads the client library and the auth2 library together for efficiency.
    // Loading the auth2 library is optional here since `gapi.client.init` function will load
    // it if not already loaded. Loading it upfront can save one network request.
    gapi.load('client:auth2', initClient);
}

function initClient()
{
    // Initialize the client with API key and People API, and initialize OAuth with an
    // OAuth 2.0 client ID and scopes (space delimited string) to request access.
    gapi.client.init({
        apiKey: "AIzaSyC4LsKUVUovDSl2aL-msnTozIfucb30dPI",
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest"],
        clientId: "8147080815-qdbov8dn9kj310q0hdfiumg0goq76spt.apps.googleusercontent.com",
        scope: 'https://www.googleapis.com/auth/youtube.readonly'
    }).then(function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

        // Handle the initial sign-in state.
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    });
}

function updateSigninStatus(isSignedIn)
{
    // When signin status changes, this function is called.
    // If the signin status is changed to signedIn, we make an API call.
    if (isSignedIn)
    {
        getLiveBroadcasts();
    }
    else
    {
        document.getElementById('chat-client-content').innerHTML = '<button onclick="handleSignInClick()">Sign In</button>';
    }
}

function handleSignInClick(event) {
    gapi.auth2.getAuthInstance().signIn();
}

function handleSignOutClick(event) {
    gapi.auth2.getAuthInstance().signOut();
}

function getLiveBroadcasts()
{
    var broadcasts, tmp = '<h1>Select from current live broadcasts</h1><select id="broadcast-select">';
    // Make an API call to the People API, and print the user's given name.
    gapi.client.request({
        "path" : "https://www.googleapis.com/youtube/v3/liveBroadcasts",
        "params" :
            {
                "part" : "snippet",
                "mine" : true
            }
    }).then(function(response){
        broadcasts = JSON.parse(response.body).items;
        broadcasts.forEach
        (
            function(broadcast)
            {
                tmp += '<option value="' + broadcast.id + '">' + broadcast.snippet.title + '</option>';
            }
        );

        tmp += '</select><button onclick="getChatIdViaBroadcastId($(\'#broadcast-select\').val())">Get Live Chat</button>';
        document.getElementById('chat-client-content').innerHTML = tmp;
    })
}

function getChatIdViaBroadcastId(id)
{
    chatId = '';
    gapi.client.request({
        "path" : "https://www.googleapis.com/youtube/v3/liveBroadcasts",
        "params" :
            {
                "part" : "snippet",
                "id" : id
            }
    }).then(function(response){
        broadcast = JSON.parse(response.body).items[0];
        console.log(broadcast)
        if (broadcast.snippet.liveChatId)
        {
            chatId = broadcast.snippet.liveChatId;
            getChatFromId(chatId);
        }
        else
        {
            alert('Video is not live, make sure video is live then try again');
        }
    })
}

function getChatFromId(id)
{
    ticker = setInterval(function(){chatTicker(id)}, 500);
}

function chatTicker(id)
{
    try
    {
        gapi.client.request({
            "path" : "https://www.googleapis.com/youtube/v3/liveChat/messages",
            "params" :
                {
                    "part" : "snippet",
                    "liveChatId" : id
                }
        }).then(function(response) {
            messages = JSON.parse(response.body).items;
            messages.forEach(function(message){
                chat_dict[message.id] = {
                    "message" : message.snippet.displayMessage,
                    "timestamp" : message.snippet.publishedAt,
                    "authorId" : message.snippet.authorChannelId
                }
            });

            displayChatDict();
        })
    }
    catch (e) // If the api request fails we know that the stream is no longer live, so there is nothing to pull
    {
        stopFeed();
        alert('Video is no longer live, no chat to pull');
    }
}

function displayChatDict()
{
    var tmp = '<button onclick="downloadData()">Download Data</button>' +
        '<button onclick="stopFeed()">Stop Feed</button>' +
        '<h1>Live Feed:</h1>' +
        '<div class="feed-box">';

    jQuery.each(chat_dict, function(){
        tmp += '<p>' + this.message + '</p>';
    });

    tmp += '</div>';

    document.getElementById('chat-client-content').innerHTML = tmp;
}

function stopFeed()
{
    clearInterval(ticker);
}

function downloadData() {
    var data_arr = [];
    var current_message;

    // First we convert the data into something we can use
    for (var key in chat_dict) {
        data_arr.push(chat_dict[key]);
    }

    Promise.all(
        data_arr.map(getAuthorFromMessage)
    ).then(function() {
        JSONToCSVConvertor(data_arr, 'Chat Data', true)
    });
}

function getAuthorFromMessage(message)
{
    try
    {
        return new Promise(function(resolve, reject){
            var id = message['authorId'];

            gapi.client.request({
                "path" : "https://www.googleapis.com/youtube/v3/channels?part=snippet",
                "params" :
                    {
                        "part" : "snippet",
                        "id" : id
                    }
            }).then(function(response) {
                message['authorId'] = JSON.parse(response.body)['items'][0]['snippet']['title'];
                resolve()
            })
        });
    }
    catch (e)
    {
        console.log('Error fetching name for id: ' + id);
        console.log(e);
        return new Promise(function(resolve, reject) {resolve()});
    }
}

function JSONToCSVConvertor(JSONData, ReportTitle, ShowLabel) {
    //If JSONData is not an object then JSON.parse will parse the JSON string in an Object
    var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;

    var CSV = '';
    //Set Report title in first row or line

    CSV += ReportTitle + '\r\n\n';

    //This condition will generate the Label/Header
    if (ShowLabel) {
        var row = "";

        //This loop will extract the label from 1st index of on array
        for (var index in arrData[0]) {

            //Now convert each value to string and comma-seprated
            row += index + ',';
        }

        row = row.slice(0, -1);

        //append Label row with line break
        CSV += row + '\r\n';
    }

    //1st loop is to extract each row
    for (var i = 0; i < arrData.length; i++) {
        var row = "";

        //2nd loop will extract each column and convert it in string comma-seprated
        for (var index in arrData[i]) {
            row += '"' + arrData[i][index] + '",';
        }

        row.slice(0, row.length - 1);

        //add a line break after each row
        CSV += row + '\r\n';
    }

    if (CSV == '') {
        alert("Invalid data");
        return;
    }

    //Generate a file name
    var fileName = ReportTitle.replace(/ /g,"_");

    //Initialize file format you want csv or xls
    var uri = 'data:text/csv;charset=utf-8,' + escape(CSV);

    // Now the little tricky part.
    // you can use either>> window.open(uri);
    // but this will not work in some browsers
    // or you will not get the correct file extension

    //this trick will generate a temp <a /> tag
    var link = document.createElement("a");
    link.href = uri;

    //set the visibility hidden so it will not effect on your web-layout
    link.style = "visibility:hidden";
    link.download = fileName + ".csv";

    //this part will append the anchor tag and remove it after automatic click
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
