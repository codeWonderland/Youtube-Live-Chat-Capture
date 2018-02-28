# Youtube-Live-Chat-Capture
Web Application to record chat from live YouTube video

## Setup Instructions
- Clone project
- Create project in [Google Developer Console](https://console.developers.google.com)
- Go to Library and enable the YouTube Data Api
- Go to Credentials and create an Oauth 2.0 Client Id
- Authorize your domain within that Id (Not in the domain verification section)
- Create an API Key with no restrictions
- Create file called `.api.js` based off of `auth-example.js` with your clientId and API Key you created before and put this file in the main project folder
- Open `index.html` in your browser and enjoy!
