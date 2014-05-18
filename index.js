var readTorrent = require('read-torrent');
var torrentStream = require('torrent-stream');
var Q = require('q');
var _ = require('underscore');

/**
 * read 64 bits from buffer starting at offset as LITTLE ENDIAN hex
 *
 * @param buffer
 * @param offset
 * @return {String}
 */
var read64LE = function(buffer, offset) {
    var ret_64_be = buffer.toString('hex', offset*8, ((offset+1)*8));
    var t = [];
    for(var i=0; i<8; i++) {
        t.push(ret_64_be.substr(i*2, 2));
    }
    t.reverse();
    return t.join('');
};

/**
 * compute checksum of the buffer splitting by chunk of lengths bits
 *
 * @param buf
 * @param length
 */
var checksumBuffer = function(buf, length) {
    var checksum = 0, checksum_hex = 0;
    for(var i=0; i<(buf.length/length); i++) {
        checksum_hex = read64LE(buf, i);
        checksum = sumHex64bits(checksum.toString(), checksum_hex).substr(-16);
    }
    return checksum;
};

/**
* calculate hex sum between 2 64bits hex numbers
*
* @param n1
* @param n2
* @return {String}
*/
var sumHex64bits = function(n1, n2) {
    if(n1.length < 16) n1 = padLeft(n1, '0', 16);
    if(n2.length < 16) n2 = padLeft(n2, '0', 16);

    // 1st 32 bits
    var n1_0 = n1.substr(0, 8);
    var n2_0 = n2.substr(0, 8);
    var i_0 = parseInt(n1_0, 16) + parseInt(n2_0, 16);

    // 2nd 32 bits
    var n1_1 = n1.substr(8, 8);
    var n2_1 = n2.substr(8, 8);
    var i_1 = parseInt(n1_1, 16) + parseInt(n2_1, 16);

    // back to hex
    var h_1 = i_1.toString(16);
    var i_1_over = 0;
    if(h_1.length > 8) {
        i_1_over = parseInt(h_1.substr(0, h_1.length - 8), 16);
    } else {
        h_1 = padLeft(h_1, '0', 8);
    }

    var h_0 = (i_1_over + i_0).toString(16);

    return h_0 + h_1.substr(-8);
};

/**
 * pad left with c up to length characters
 *
 * @param str
 * @param c
 * @param length
 * @return {String}
 */
var padLeft = function(str, c, length) {
    while(str.length < length) {
        str = c.toString() + str;
    }
    return str;
};


/**
 * compute a torrent's movie hash
 *
 * @param torrentUrl
 * @param options
 * @return {Q.Promise}
 */
var computeMovieHash = function(torrentUrl, _engine){
    var deferred = Q.defer();

    var chunk_size = 65536;
    var buf_pad = new Buffer(chunk_size);
    var file_size = 0;
    var file_name = null;
    var t_chksum = [];

    function addChecksum (chksum_part, name) {
        t_chksum.push(chksum_part);
        if(t_chksum.length == 3) {
            var chksum = sumHex64bits(t_chksum[0], t_chksum[1]);
            chksum = sumHex64bits(chksum, t_chksum[2]);
            chksum = chksum.substr(-16);
            deferred.resolve({
                movieHash: padLeft(chksum, '0', 16), 
                fileSize: file_size,
                fileName: file_name
            });
        }
    }

    readTorrent(torrentUrl, function(err, torrent) {
        if(err) {
            App.vent.trigger('error', err);
            App.vent.trigger('stream:stop');
        } else {
            // Get the opening and closing chunks of the file
            var engine = _engine || torrentStream(torrent);

            engine.on('ready', function() {
                // Video file is the biggest one within the torrent
                var file = _.sortBy(engine.files, function(file){
                    return -file.length;
                })[0];

                // Get file meta-data
                file_name = file.name;
                file_size = file.length;
                addChecksum(file_size.toString(16), "filesize");

                // Opening chunk
                var openingStream = file.createReadStream({
                    start: 0,
                    end: chunk_size-1
                });
                openingStream.on('data', function(data) {
                    var buffer = Buffer.concat([data, buf_pad]);
                    addChecksum(checksumBuffer(buffer, 16), 'opening chunk');
                })

                // Closing chunk
                var closingStream = file.createReadStream({
                    start: file_size - chunk_size,
                    end: file_size -1
                });
                closingStream.on('data', function(data) {
                    var buffer = Buffer.concat([data, buf_pad]);
                    addChecksum(checksumBuffer(buffer, 16), 'closing chunk');
                })
            });
        }
    });

    return deferred.promise;
}

exports.computeHash = function(torrentUrl, engine) {
    return computeMovieHash(torrentUrl, engine);
}