# Define the MP3 file's location
mp3_file = "/assets/song.mp3"

# Create a single playback source from the MP3 file
source = single(mp3_file)

# Output the source to the Icecast server
output.icecast(
  %mp3,
  host="localhost",
  port=8000,
  password="sourcepassword",
  mount="/mystream.mp3",
  source
)
