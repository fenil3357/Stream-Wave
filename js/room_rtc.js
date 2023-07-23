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

let displayName = localStorage.getItem('display_name')

if(!displayName) {
    window.location = `lobby.html`
}

let localTrack = [];  // Index 0 for the audio(mic) and Index 1 for the video(camera)
let remoteUsers = {};

let localScreenTracks;
let sharingScreen = false;

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

let switchToCamera = async () => {
    let player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div> 
                  </div>`

    displayFrame.insertAdjacentHTML('beforeend', player);

    await localTrack[0].setMuted(true);
    await localTrack[1].setMuted(true);

    document.getElementById('mic-btn').classList.remove('active')
    document.getElementById('screen-btn').classList.remove('active')

    localTrack[1].play(`user-${uid}`)
    await client.publish([localTrack[1]]);
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
        let videoFrame = document.getElementById(`user-container-${user.uid}`)
        videoFrame.style.height = '100px';
        videoFrame.style.width = '100px';
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

        for (let i = 0; i < videoFrames.length; i++) {
            videoFrames[i].style.height = '300px'
            videoFrames[i].style.width = '300px'
        }
    }
}

let toggleMic = async (e) => {
    let button = e.currentTarget;

    if (localTrack[0].muted) {
        await localTrack[0].setMuted(false);
        button.classList.add('active')
    }
    else {
        await localTrack[0].setMuted(true);
        button.classList.remove('active')
    }
}

let toggleCamera = async (e) => {
    let button = e.currentTarget;

    if (localTrack[1].muted) {
        await localTrack[1].setMuted(false);
        button.classList.add('active')
    }
    else {
        await localTrack[1].setMuted(true);
        button.classList.remove('active')
    }
}

let toggleScreen = async (e) => {
    let screenButton = e.currentTarget;
    let cameraButton = document.getElementById('camera-btn')

    if (!sharingScreen) {
        sharingScreen = true;

        screenButton.classList.add('active')
        cameraButton.classList.remove('active')
        cameraButton.style.display = 'none'

        localScreenTracks = await AgoraRTC.createScreenVideoTrack()

        document.getElementById(`user-container-${uid}`).remove()
        displayFrame.style.display = 'block'

        let player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div> 
                  </div>`

        displayFrame.insertAdjacentHTML('beforeend', player)
        document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);

        userIdInDisplayFrame = `user-container-${uid}`
        localScreenTracks.play(`user-${uid}`)

        await client.unpublish([localTrack[1]])
        await client.publish([localScreenTracks])

        let videoFrames = document.getElementsByClassName('video__container')

        for (let i = 0; i < videoFrames.length; i++) {
            if (videoFrames[i].id != userIdInDisplayFrame) {
                videoFrames[i].style.height = '100px';
                videoFrames[i].style.width = '100px';
            }
        }
    }
    else {
        sharingScreen = false;
        cameraButton.style.display = 'block'
        document.getElementById(`user-container-${uid}`).remove();
        await client.unpublish([localScreenTracks])

        switchToCamera();
    }
}

document.getElementById('camera-btn').addEventListener("click", toggleCamera);
document.getElementById('mic-btn').addEventListener("click", toggleMic);
document.getElementById('screen-btn').addEventListener("click", toggleScreen);

joinRoomInit();