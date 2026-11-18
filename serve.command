#!/bin/sh
# Serves this folder at http://localhost:8000/ and opens it in the browser.
# The speaker window needs http, not file://. Close this window to stop the server.
cd "$(dirname "$0")" || exit 1
# Opens the browser once the server answers; Python can take a few seconds to start.
(
  i=0
  while [ "$i" -lt 20 ] && ! curl -s -o /dev/null http://localhost:8000/; do
    i=$((i + 1))
    sleep 1
  done
  open "http://localhost:8000/"
) &
exec python3 -m http.server 8000
