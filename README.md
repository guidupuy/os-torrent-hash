os-torrent-hash
================

Compute opensubtitles movie hash from a torrent file, and a [torrent-stream](https://www.npmjs.org/package/torrent-stream) engine
Example:
```javascript
computeMovieHash(torrentUrl, engine) // engine is a torrent-stream engine
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
