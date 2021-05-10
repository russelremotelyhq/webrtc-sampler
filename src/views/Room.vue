<template>
  <div class="container mx-auto shadow-lg rounded-lg">
    <div class="px-5 py-5 flex justify-between border-b-2">
      <div class="font-semibold text-2xl">RTC Demo</div>
      <div class="flex justify-between bg-white space-x-4">
        <div class="cursor-pointer  py-2 px-4 bg-red-500 text-white font-semibold flex items-center justify-center" @click="shareScreen" v-if="!displayStream && !sharedStream">
          <span>Start Screen Sharing</span>
        </div>
        <div class="cursor-pointer  py-2 px-4 bg-red-500 text-white font-semibold flex items-center justify-center" @click="stopShare" v-if="displayStream">
          <span>Stop Screen Sharing</span>
        </div>
        <div class="cursor-pointer py-2 px-4 bg-blue-500 text-white font-semibold flex items-center justify-center" @click="muteAll">
          <span v-if="!allMuted">Mute All</span>
          <span v-if="allMuted">Unmute All</span>
        </div>
        <div class="cursor-pointer  py-2 px-4 bg-blue-500 text-white font-semibold flex items-center justify-center" @click="mute">
          <span v-if="!muted">Mute</span>
          <span v-if="muted">Unmute</span>
        </div>
        <div class="cursor-pointer  py-2 px-4 bg-blue-500 text-white font-semibold flex items-center justify-center" @click="leave">
          <span>Leave</span>
        </div>
        <div class="cursor-pointer  py-2 px-4 bg-blue-500 text-white font-semibold flex items-center justify-center" @click="close">
          <span>Close Meeting</span>
        </div>
      </div>
    </div>
    <div class="container mx-auto shadow-lg rounded-lg flex">
      <div class="w-2/3">
        <div class="" v-if="sharedStream">
          <video :srcObject="sharedStream" autoplay></video>
        </div>
        <div class="" v-if="displayStream">
          <video :srcObject="displayStream" autoplay></video>
        </div>
        <div id="streams" class="flex items-start bg-white border-b-2 p-5 space-x-4">
          <div  v-for="(stream, index) in streams" :key="index" class="flex-initial h-1/6 w-1/8 bg-black">
            <h2>{{ index }}</h2>
            <audio :srcObject="stream" :muted="allMuted" autoplay></audio>
          </div>
        </div>
        <div class="flex justify-between">
          <div class="p-3">
            <h3>Microphone</h3>
            <select v-model="audioInputId" class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option :value="info.deviceId" v-for="(info, i) in audioInputs" :key="i">{{ info.label }}</option>
            </select>
          </div>
        </div>
      </div>
      <div class="w-1/3 border border-l-2 py-4">
        <h1 class="font-bo">Chat</h1>
        <div id="messages" class="flex flex-col space-y-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch">
          <div class="chat-message" v-for="(chat, i) in chats" :key="i">
            <div class="flex items-end" v-if="chat.user !== uuid">
              <div class="flex flex-col space-y-2 text-xs max-w-xs mx-2 order-2 items-start">
                <div><span class="px-4 py-2 rounded-lg inline-block rounded-bl-none bg-gray-300 text-gray-600">{{ chat.text }}</span></div>
              </div>
              <img src="https://images.unsplash.com/photo-1549078642-b2ba4bda0cdb?ixlib=rb-1.2.1&amp;ixid=eyJhcHBfaWQiOjEyMDd9&amp;auto=format&amp;fit=facearea&amp;facepad=3&amp;w=144&amp;h=144" alt="My profile" class="w-6 h-6 rounded-full order-1">
            </div>
            <div class="flex items-end justify-end" v-else>
              <div class="flex flex-col space-y-2 text-xs max-w-xs mx-2 order-1 items-end">
                <div><span class="px-4 py-2 rounded-lg inline-block rounded-br-none bg-blue-600 text-white ">{{ chat.text }}</span></div>
              </div>
              <img src="https://images.unsplash.com/photo-1549078642-b2ba4bda0cdb?ixlib=rb-1.2.1&amp;ixid=eyJhcHBfaWQiOjEyMDd9&amp;auto=format&amp;fit=facearea&amp;facepad=3&amp;w=144&amp;h=144" alt="My profile" class="w-6 h-6 rounded-full order-1">
            </div>
          </div>
        </div>
        <div class="border-t-2 border-gray-200 px-4 pt-4 mb-2 sm:mb-0">
          <div class="relative flex">
            <input type="text" v-model="chatMessage" @keyup.enter="sendChat" placeholder="Write Something" class="w-full focus:outline-none focus:placeholder-gray-400 text-gray-600 placeholder-gray-600 pl-12 bg-gray-200 rounded-full py-3">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// @ is an alias to /src
import * as signalR from "@microsoft/signalr";


export default {
  name: 'Room',
  data () {
    return {
      configuration: {
        'iceServers': [{
          'urls': 'stun:stun.l.google.com:19302'
        }]
      },
      roomInfo: null,
      uuid: null,
      peers: {},
      streams: {},
      stream: null,
      displayStream:null,
      audioInputs: [],
      audioOutputs: [],
      videoInputs: [],
      audioInputId: "default",
      audioOutputId: "default",
      videoInputId: "default",
      muted: false,
      allMuted: false,
      sharingStarted: false,
      sharePeers: {},
      sharedPeer: null,
      sharedStream: null,
      chats: [],
      users: [],
      chatMessage: ""
    }
  },
  created() {
    this.connection = new signalR.HubConnectionBuilder()
        .withUrl("https://room-api-dev-remotely.azurewebsites.net/meetinghub")
        .withAutomaticReconnect()
        .build()
  },
  mounted () {
    this.connection.start().then(() => {
      navigator.mediaDevices.enumerateDevices().then(this.gotDevices)
      navigator.mediaDevices.getUserMedia(this.mediaConfig).then(stream => {
        this.stream = stream
      })

      this.connection.invoke("entered", this.roomId)

      this.connection.on("ready", (room) => {
        console.log(`room is ready ${room}`)
      })

      this.connection.on("joined", (uuid) => {
        console.log(`user joined ${uuid}`)
        this.uuid = uuid
      }):q

      this.connection.on("call", (fromUserId) => {
        console.log(`call from ${fromUserId}`)
        this.sendOfferToCaller(fromUserId)
      })

      this.connection.on("offer", (message) => {
        console.log(`offer received ${message}`)
        this.sendAnswerToOffer(message)
      })

      this.connection.on("answer", (message) => {
        let {fromUserId, data} = message
        console.log(`answer received ${fromUserId}`)
        let peer = this.peers[fromUserId]
        peer.setRemoteDescription(new RTCSessionDescription(data)).catch((err) => console.log(err))
      })

      this.connection.on("candidate", (message) => {
        let {fromUserId, data} = message
        let peer = this.peers[fromUserId]
        if (peer) {
          peer.addIceCandidate(data).catch(e => console.log(e));
        }
      })

      this.connection.on("share-candidate", (message) => {
        let {fromUserId, data} = message
        let peer = this.sharePeers[fromUserId]
        if (peer) {
          peer.addIceCandidate(data).catch(e => console.log(e))
        } else {
          this.sharedPeer.addIceCandidate(data).catch(e => console.log(e))
        }
      })

      this.connection.on("user-left-room", (peerId) => {
        this.peers[peerId].close()
        delete this.peers[peerId]
        delete this.streams[peerId]
      })

      this.connection.on("invalid-room", () => {
        alert("Invalid room")
      })

      this.connection.on("end", () => {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;

        for(let key in this.peers) {
          this.peers[key].close()
        }
        this.$router.push({name: "Home"})

        this.connection.stop()
      })

      this.connection.on("share-offer", (message) => {
        this.answerShareOffer(message)
      })

      this.connection.on("share-answer", (message) => {
        let {fromUserId, data} = message

        console.log(`received share answer from ${fromUserId}`)
        let peer = this.sharePeers[fromUserId]
        peer.setRemoteDescription(new RTCSessionDescription(data)).catch((err) => console.log(err))
      })

      this.connection.on("end-share", () => {
        this.sharedPeer = null
        this.sharedStream = null
      })

      this.connection.on("chat-message", (message) => {
        this.chats.push({user: message.fromUserId, text: message.data })
      })

      window.addEventListener('unload',  () => {
        this.connection.invoke("leave", this.roomId).catch(function (err) {
          return console.error(err.toString())
        }).then(() => {
          this.connection.stop()
        })
      })
    })
  },
  methods: {
    sendChat () {
      this.connection.invoke("ChatMessage", this.roomId, this.chatMessage)
      this.chats.push({user: this.uuid, text: this.chatMessage})
      this.chatMessage = ""
    },
    stopShare() {
      this.connection.invoke("StopShare", this.roomId)
      for(let key in this.peers) {
        this.peers[key].close()
      }
      this.displayStream.getTracks().forEach(track => {
        track.stop()
      })
      this.displayStream = null
      this.sharedStream = null
      this.peers = {}
    },
    shareScreen () {
      // create new offer to all existing users
      navigator.mediaDevices.getDisplayMedia({video: true}).then(stream => {
        this.displayStream = stream

        for(let uuid in this.peers) {
          let peer = new RTCPeerConnection()
          this.displayStream.getTracks().forEach(track => {
            peer.addTrack(track)
          })

          peer.onicecandidate = (event) => {
            if (event.candidate) {
              this.connection.invoke("ShareCandidate", uuid, this.uuid, event.candidate)
            }
          }

          peer.createOffer().then(offer => {
            return peer.setLocalDescription(offer)
          }).then(() => {
            console.log(`send offer to share offer from ${uuid}`)
            this.connection.invoke("ShareOffer", uuid, peer.localDescription)
          })

          this.sharePeers[uuid] = peer
        }
      })
    },
    answerShareOffer ({ fromUserId, data }) {
      console.log(`send answer to share offer from ${fromUserId}`)
      let peer = new RTCPeerConnection()

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          this.connection.invoke("ShareCandidate", this.uuid, fromUserId, event.candidate)
        }
      }

      this.sharedStream = new MediaStream()
      peer.ontrack = (event) => {
        this.sharedStream.addTrack(event.track)
      }

      peer.setRemoteDescription(new RTCSessionDescription(data)).catch((err) => console.log(err))

      peer.createAnswer().then(desc => {
        return peer.setLocalDescription(desc);
      }).then(() => {
        this.connection.invoke("AnswerShareOffer", fromUserId, peer.localDescription).catch(function (err) {
          return console.error(err.toString());
        });
      })

      this.sharedPeer = peer
    },
    close() {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.connection.invoke("end", this.roomId)
      this.$router.push({name: "Home"})
    },
    leave() {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.connection.invoke("leave", this.roomId)
      this.$router.push({name: "Home"})
    },
    muteAll () {
      this.allMuted = !this.allMuted
    },
    mute () {
      this.muted = !this.muted
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
        for(let key in this.peers) {
          let sender = this.peers[key].getSenders().find((s) => {
            return s.track.kind === track.kind;
          })
          sender.replaceTrack(track);
        }
      })
    },
    getUserMedia() {
      navigator.mediaDevices.getUserMedia(this.mediaConfig).then(stream => {
        this.stream = stream
        this.stream.getTracks().forEach(track => {
          for(let key in this.peers) {
            let sender = this.peers[key].getSenders().find((s) => {
              return s.track.kind === track.kind;
            })
            sender.replaceTrack(track);
          }
        })
      })
    },
    gotDevices(deviceInfos) {
      for (let i = 0; i !== deviceInfos.length; ++i) {
        const deviceInfo = deviceInfos[i];
        if (deviceInfo.kind === 'audioinput') {
          this.audioInputs.push(deviceInfo)
        } else if (deviceInfo.kind === 'audiooutput') {
          this.audioOutputs.push(deviceInfo)
        } else if (deviceInfo.kind === 'videoinput') {
          this.videoInputs.push(deviceInfo)
        }
      }
    },
    sendOfferToCaller(fromUserId) {
      console.log(`send offer to ${fromUserId}`)
      let peer = new RTCPeerConnection()
      this.stream.getTracks().forEach(track => {
        if (track.kind === "video") {
          track.enabled = false
        }
        peer.addTrack(track)
      })

      this.streams[fromUserId] = new MediaStream();
      peer.ontrack = (event) => {
        this.streams[fromUserId].addTrack(event.track)
      }

      peer.addTransceiver("video");

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          this.connection.invoke("candidate", this.uuid, fromUserId, event.candidate)
        }
      }

      peer.createOffer().then(offer => {
        return peer.setLocalDescription(offer)
      }).then(() => {
        console.log(`sending offer to ${fromUserId}`)
        this.connection.invoke("offer", fromUserId, peer.localDescription)
      })

      this.peers[fromUserId] = peer
    },
    sendAnswerToOffer({ fromUserId, data }) {
      console.log(`send answer to ${fromUserId}`)
      let peer = new RTCPeerConnection()
      this.stream.getTracks().forEach(track => {
        if (track.kind === "video") {
          track.enabled = false
        }
        peer.addTrack(track)
      })

      this.streams[fromUserId] = new MediaStream();
      peer.ontrack = (event) => {
        this.streams[fromUserId].addTrack(event.track)
      }

      peer.addTransceiver("video");

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          this.connection.invoke("candidate", fromUserId, this.uuid, event.candidate)
        }
      }

      peer.setRemoteDescription(new RTCSessionDescription(data)).catch((err) => console.log(err))

      peer.createAnswer().then(desc => {
        return peer.setLocalDescription(desc);
      }).then(() => {
        this.connection.invoke("answer", fromUserId, peer.localDescription).catch(function (err) {
          return console.error(err.toString());
        });
      })

      this.peers[fromUserId] = peer
    }
  },
  watch: {
    audioInputId() {
      this.getUserMedia()
    },
    videoInputId() {
      this.getUserMedia()
    }
  },
  computed: {
    roomId() {
      return this.$route.params.id
    },
    mediaConfig() {
      return {
        audio: {deviceId: this.audioInputId}
      }
    }
  },
}
</script>

