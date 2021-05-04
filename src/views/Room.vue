<template>
  <div>
    <div class="connectionStatus">
      <p id="connectionStatusMessage">{{ connectionStatusMessage }}</p>
    </div>
    <h5>Video chat</h5>
    <div id="videoArea">
    </div>
    <video id="remoteVideo" autoplay playsinline></video>
    <button class="rounded px-5 py-2 border bg-green-500" @click.prevent="call">Call</button>
  </div>
</template>

<script>
// @ is an alias to /src
import * as signalR from "@microsoft/signalr";
export default {
  name: 'Room',
  data () {
    return {
      connectionStatusMessage: "You can create your own room or join the other room.",
      connection: null,
      myConnectionId: null,
      connectionIds: [],
      peerConn: null,
      myRoomId: null,
      localStream: null,
      remoteStream: null,
      isInitiator: false,
      hasRoomJoined: null,
      videoGrid: null,
      configuration: {
        'iceServers': [{
          'urls': 'stun:stun.l.google.com:19302'
        }]
      },
      roomInfo: null
    }
  },
  async created() {
    this.connection = new signalR.HubConnectionBuilder().withUrl("https://localhost:5001/meetinghub").build()
    this.peerConn = new RTCPeerConnection(this.configuration)

    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    }).then(stream => {
      this.peerConn.addStream(stream)
      //stream.getTracks().forEach(track => {this.peerConn.addTrack(track, stream)}))
    })

    this.peerConn.ontrack = (event) => {
      console.log(event)
      const remoteVideo = document.getElementById('remoteVideo');
      let inboundStream = new MediaStream();
      remoteVideo.srcObject = event.streams[0];
      inboundStream.addTrack(event.track);

      this.addVideoStream(event.streams[0])
    };

    this.peerConn.onicecandidate = this.handleICECandidateEvent
  },
  computed: {
    roomId () {
      return this.$route.params.id
    }
  },
  mounted() {

    this.connection.start().then(() => {
      this.connection.invoke("Join", this.roomId)
      this.connection.on('joined', () => {
        this.grabWebCamVideo()
      });

      this.connection.on('message',  (message) => {
        console.log('Client received message:', message);
        this.signalingMessageCallback(message);
      });
    })
  },
  methods: {
    handleICECandidateEvent(event) {
      if (event.candidate) {
        this.sendMessage({
          type: "candidate",
          candidate: event.candidate
        });
      }
    },
    call() {
      this.isInitiator = true
      this.peerConn.createOffer().then((desc) => {
        return this.peerConn.setLocalDescription(desc);
      }).then(() => {
        this.sendMessage(this.peerConn.localDescription)
      })
    },
    grabWebCamVideo() {
      navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      })
      .then(stream => this.gotStream(stream))
    },
    gotStream(stream) {
      this.localStream = stream;
      this.addVideoStream(this.localStream)
    },
    addVideoStream(stream) {
      const video = document.createElement('video')
      video.muted = true
      video.srcObject = stream
      video.addEventListener('loadedmetadata', () => {
        video.play()
      })
      const videoGrid = document.getElementById('videoArea');
      videoGrid.append(video)
    },
    async createPeerConnection() {
      this.peerConn.onicecandidate = (event) => {
        if (event.candidate) {
          // Trickle ICE
          /*this.sendMessage({
              type: 'candidate',
              label: event.candidate.sdpMLineIndex,
              id: event.candidate.sdpMid,
              candidate: event.candidate.candidate
          });*/
        } else {
          //console.log('End of candidates.');
          // Vanilla ICE
          this.sendMessage(this.peerConn.localDescription);
        }
      };

      this.peerConn.ontrack = (event) => {
        const remoteVideo = document.getElementById('remoteVideo');
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.srcObject.addTrack(event.track)
      };

      let desc = await this.peerConn.createOffer();
      this.onLocalSessionCreated(desc)
    },
    onLocalSessionCreated(desc) {
      this.peerConn.setLocalDescription(desc);
      this.sendMessage(desc);
    },
    signalingMessageCallback(message) {
      if (message.type === 'offer' && !this.isInitiator) {
        this.peerConn.setRemoteDescription(new RTCSessionDescription(message)).catch((err) => console.log(err))
        this.peerConn.createAnswer().then(desc => {
          return this.peerConn.setLocalDescription(desc);
        }).then(() => {
          this.sendMessage(this.peerConn.localDescription)
        })
      } else if (message.type === 'answer' && this.isInitiator) {
        this.peerConn.setRemoteDescription(new RTCSessionDescription(message)).catch((err) => console.log(err))
      } else if (message.type === 'candidate') {
        this.peerConn.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    },
    sendMessage(message) {
      //console.log('Client sending message: ', message);
      this.connection.invoke("SendMessage", this.roomId, message).catch(function (err) {
        return console.error(err.toString());
      });
    }
  }
}

/***
 *
 * this.connection.start().then(() => {

      this.connection.on('joined',  (roomId) => {
        console.log('This peer has joined room', roomId);
        this.myRoomId = roomId;
        this.isInitiator = false;
      })

      this.connection.on('error',  (message) => {
        alert(message);
      })

      this.connection.on('ready',  () => {
        console.log('Socket is ready');
        this.hasRoomJoined = true;
        this.connectionStatusMessage = 'Connecting...';
        this.createPeerConnection(this.isInitiator, this.configuration);
      });

      this.connection.on('message',  (message) => {
        console.log('Client received message:', message);
        this.signalingMessageCallback(message);
      });

      this.connection.on('bye', () => {
        console.log(`Peer leaving room.`);
        // If peer did not create the room, re-enter to be creator.
        this.connectionStatusMessage = `Other peer left room ${this.myRoomId}.`;
      });

      window.addEventListener('unload',  () => {
        if (this.hasRoomJoined) {
          console.log(`Unloading window. Notifying peers in ${this.myRoomId}.`);
          this.connection.invoke("LeaveRoom", this.myRoomId).catch(function (err) {
            return console.error(err.toString());
          });
        }
      });

      //Get room list.
      this.connection.invoke("GetRoomInfo").catch(function (err) {
        return console.error(err.toString());
      });

      // invoke join
      this.connection.invoke("Join", this.roomId).catch(function (err) {
        return console.error(err.toString());
      });
    })
 */

/**
 *
 this.videoGrid = document.getElementById('videoArea')
 this.grabWebCamVideo()
 this.connection.start().then(() => {
      this.connection.on("joined", (myConnectionId) => {
        this.myConnectionId = myConnectionId
      })

      this.connection.on('bye', (roomInfo) => {
        this.connectionIds = roomInfo.connections
      });

      this.connection.on('ready',  (roomInfo) => {
        this.hasRoomJoined = true;
        this.connectionStatusMessage = 'Connecting...';
        this.connectionIds = roomInfo.connections
        this.createPeerConnection();
      });

      this.connection.on("message", message => {
        this.signalingMessageCallback(message)
      })

      this.connection.invoke("Join", this.roomId)

      window.addEventListener('unload',  () => {
        this.peerConn.close()
        if (this.hasRoomJoined) {
          //console.log(`Unloading window. Notifying peers in ${this.myRoomId}.`);
          this.connection.invoke("LeaveRoom", this.roomId).catch(function (err) {
            return console.error(err.toString());
          });
        }
      });
    })
 */
</script>

