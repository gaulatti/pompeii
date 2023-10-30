# Define the MP3 file's location
# mp3_file = "https://cdn-oxozon.s3.us-west-2.amazonaws.com/prisioneros.mp3"

# Create a single playback source from the MP3 file
source = mksafe(input.https("https://cdn.oxozon.io/prisioneros.mp3"))

set("server.http", true)
set("server.http.port", 8080)

# Output the source to the Icecast server
output.icecast(
  %mp3,
  host="localhost",
  port=8000,
  password="sourcepassword",
  mount="/mystream.mp3",
  source
)
