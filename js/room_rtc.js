const APP_ID = "1d24b6e940dc411e8f8dac99fb739dce"

let uid = sessionStorage.getItem('uid');

if (!uid) {
    uid = String(Math.floor(Math.random() * 10000));
    sessionStorage.setItem('uid', uid);
}

let token = null;
let client;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let roomId = urlParams.get('room');

if (!roomId) {
    roomId = 'main';
}

let localTrack = [];
let remoteUsers = {};

let joinRoomInit = async () => {
    client = AgoraRTC.createClient({
        mode: 'rtc',
        codec: 'vp8'
    });

    await client.join(APP_ID, roomId, token, uid)

    client.on('user-published', handleUserPublished);
    client.on('user-left', handleUserLeft);

    joinStream();
}

let joinStream = async () => {
    localTrack = await AgoraRTC.createMicrophoneAndCameraTracks(
        // {},
        // {
        //     encoderConfig: {
        //         width: { min: 640, ideal: 1920, max: 1920 },
        //         height: { min: 480, ideal: 1080, max: 1080 }
        //     }
        // }
    );

    let player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div> 
                  </div>`

    document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
    document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);

    localTrack[1].play(`user-${uid}`)
    await client.publish([localTrack[0], localTrack[1]]);
}

let handleUserPublished = async (user, mediaType) => {
    remoteUsers[user.uid] = user;

    await client.subscribe(user, mediaType);

    let player = document.getElementById(`user-container-${user.uid}`)

    if (player === null) {
        player = `<div class="video__container" id="user-container-${user.uid}">
                    <div class="video-player" id="user-${user.uid}"></div> 
                  </div>`

        document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
        document.getElementById(`user-container-${user.uid}`).addEventListener('click', expandVideoFrame);
    }

    // If a user is currently on focus and some other user join, then make new user's videoFrame small
    if (displayFrame.style.display) {
        player.style.height = '100px';
        player.style.width = '100px';
    }

    if (mediaType === 'video') {
        user.videoTrack.play(`user-${user.uid}`);
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
}

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid]
    document.getElementById(`user-container-${user.uid}`).remove();

    // If the user who left was currently on focus(mainFrame)
    if (userIdInDisplayFrame == `user-container-${user.uid}`) {
        displayFrame.style.display = null;

        let videoFrames = document.getElementsByClassName('video__container')

        for (let i = 0; i<videoFrames.length; i++) {
            videoFrames[i].style.height = '300px'
            videoFrames[i].style.width = '300px'
        }
    }
}

joinRoomInit();