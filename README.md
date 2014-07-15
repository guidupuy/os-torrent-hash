os-torrent-hash
================

Compute opensubtitles movie hash from a torrent file.
Example:
```javascript
computeMovieHash(torrentUrl, engine) // engine is a peerflix engine
    .then(function (res) {
        res.movieHash; // the movie hash
        res.fileSize;  // the file name
        res.fileName;  // the file name
    })
    .catch(function (error) {
        // Handle any error from all above steps
    })
    .done();
```
