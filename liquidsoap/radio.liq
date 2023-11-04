# Define the MP3 file's location
mp3_file = "/assets/song.mp3"

# Create a single playback source from the MP3 file
source = mksafe(single(mp3_file))

settings.server.telnet.set(true)
settings.server.telnet.revdns.set(false)
settings.server.telnet.port.set(2345)
settings.server.telnet.bind_addr.set("0.0.0.0")
# Output the source to the Icecast server
output.icecast(
  %mp3,
  host="localhost",
  port=8000,
  password="sourcepassword",
  mount="/mystream.mp3",
  source
)
