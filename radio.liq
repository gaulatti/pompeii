# Define the MP3 file's location
mp3_file = "https://cdn.oxozon.io/prisioneros.mp3"

# Create a single playback source from the MP3 file
source = mksafe(input.https(mp3_file))
set("server.http", true)
set("server.http.port", 8080)

buffered_input = mksafe(buffer(buffer=1.0, max=20.0, source))
# Output the source to the Icecast server
output.icecast(
  %mp3,
  host="localhost",
  port=8000,
  password="sourcepassword",
  mount="/mystream.mp3",
  buffered_input
)
