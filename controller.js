function Controller() {
    var self = this; //<- I hate javascript.

    this.noteSelected = function(sender) {
        var note = sender.note;
        if (window.location.hash !== '#' + note.note_id) {
            history.pushState('', '', '#' + note.note_id);
        }
        model.views.noteView = new NoteView(note);
        model.views.noteViewContainer.innerHTML = '';
        model.views.noteViewContainer.appendChild(model.views.noteView.html);
        $('.sifter-modal-overlay').show();
    };

    this.createNote = function() {
        model.views.noteCreateView = new NoteCreateView();
        model.views.createNoteViewContainer.innerHTML = '';
        model.views.createNoteViewContainer.appendChild(model.views.noteCreateView.html);
        
        var iOS = (navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false);
        var clickEvent = iOS ? 'touchend' : 'click';
        $('#submitNote').on(clickEvent, submitNote);
        $('#cancelNote').on(clickEvent, cancelNote);
        $('#cancelNoteOverlay').on(clickEvent, cancelNote);
        $('#cancelNoteOverlay').show();

        document.getElementById("create_tag_1").checked = true; //this is the default tag, it should be checked (but can't do it in HTML for reasons)
    };

    // TODO refactor all these into a function that accepts a view container, and content and takes care of clearing/showing/hiding.
    // ex: model.views.popup(model.views.loginViewContainer, model.views.loginView);
    this.showLoginView = function() {
        self.hideJoinView(); // only show one at a time
        self.hideForgotView(); // only show one at a time
        model.views.loginView = new LoginView();
        model.views.loginViewContainer.innerHTML = '';
        model.views.loginViewContainer.appendChild(model.views.loginView.html);

        var iOS = (navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false);
        var clickEvent = iOS ? 'touchend' : 'click';
        $('#login'         ).on(clickEvent, clickLogin         );
        $('#noAccount'     ).on(clickEvent, clickNoAccount     );
        $('#forgotPassword').on(clickEvent, clickForgotPassword);

        // Bind enter-key handlers
        var enterHandler = function(evt) {
            if (evt.which === 13) {
                $('#login').click();
                return false;
            }
            return true;
        };
        $('#username_login').keypress(enterHandler);
        $('#password_login').keypress(enterHandler);

        $('.sifter-modal-overlay').show();
    };

    this.showForgotView = function() {
        self.hideLoginView(); // only show one at a time
        model.views.forgotView = new ForgotView();
        model.views.forgotViewContainer.innerHTML = '';
        model.views.forgotViewContainer.appendChild(model.views.forgotView.html);
        $('.sifter-modal-overlay').show();
    };

    this.showJoinView = function() {
        self.hideLoginView(); // only show one at a time
        model.views.joinView = new JoinView();
        model.views.joinViewContainer.innerHTML = '';
        model.views.joinViewContainer.appendChild(model.views.joinView.html);
        $('.sifter-modal-overlay').show();
    };

    this.populateMapNotesFromModel = function(center) {
        for (var i = 0; i < model.mapMarkers.length; i++)
            if (model.mapMarkers[i].marker != null) model.mapMarkers[i].marker.setMap(null);
        model.mapMarkers = [];
        model.views.markerclusterer.clearMarkers();
        var tmpmarker;
        for (var i = 0; i < model.gameNotes.length; i++) {
            tmpmarker = new MapMarker(this.noteSelected, model.gameNotes[i]);
            model.mapMarkers[model.mapMarkers.length] = tmpmarker;
        }

        if (center) {
            var bounds = new google.maps.LatLngBounds();
            for (var i = 0; i < model.mapMarkers.length; i++)
                if (model.mapMarkers[i].note.geoloc.Xa != 0 && model.mapMarkers[i].note.geoloc.Ya != 0)
                    bounds.extend(model.mapMarkers[i].note.geoloc);
            setTimeout(function() {
                model.views.gmap.fitBounds(bounds);
            }, 100);
        }
    };

    this.populateListNotesFromModel = function() {
        model.views.mainViewLeft.innerHTML = '';

        for (var i = 0; i < model.gameNotes.length; i++) {
            var listNote = new ListNote(this.noteSelected, model.gameNotes[i], model.gameNotes[i].note_id);
            if (!!listNote.html) model.views.mainViewLeft.appendChild(listNote.html);
            //make sure it's not blank, if it is it'll crash    
        }
        controller.getNoteFromURL();
    };

    this.matchesFilter = function(note, filter) {

        filterLC = filter.toLowerCase().trim(); //we'll be comparing everything in lower case, trim off leading & trailing spaces

        if (filterLC == "") return true;

        // check contributor
        if (note.username.toLowerCase().indexOf(filterLC) != -1) return true;

        //determine if we need to check the media type 
        var mediaTypeSearch = (filterLC == 'audio' || filterLC == 'video'); //text and photos are manadatory 

        for (var i = 0; i < note.contents.length; i++) {
            if (note.contents[i].type == 'TEXT') {

                // check the title/caption 
                if (note.contents[i].text.toLowerCase().indexOf(filterLC) != -1) return true;

            }
            if (mediaTypeSearch) { //we computed those which don't need to be checked earlier to make this run faster

                //check type
                if (note.contents[i].type.toLowerCase().indexOf(filterLC) != -1) return true;
            }
        }


        return false;
    };

    this.rightSideOfCell = function(text) {
        return "<div id='selector_cell_right_id' class='selector_cell_right' style='float:right; vertical-align:middle; padding-top:5px; padding-right:20px';>" + text + "</div>";
    }

    // NOTE: Don't think this is used, click event from sifter-mobile.js is called instead - Jazmyn
    this.hideNoteView = function() {
        model.views.noteViewContainer.innerHTML = '';
        $('.sifter-modal-overlay').hide();
        document.removeEventListener('click', controller.hideNoteView, false);
    }

    this.hideCreateNoteView = function() {
        model.views.createNoteViewContainer.innerHTML = '';
        $('.sifter-modal-overlay').hide();
        document.removeEventListener('click', controller.hideCreateNoteView, false);
    }

    this.hideLoginView = function() {
        model.views.loginViewContainer.innerHTML = '';
        $('.sifter-modal-overlay').hide();
        document.removeEventListener('click', controller.hideLoginView, false);
    }
    this.hideForgotView = function() {
        model.views.forgotViewContainer.innerHTML = '';
        $('.sifter-modal-overlay').hide();
        document.removeEventListener('click', controller.hideForgotView, false);
    }

    this.hideJoinView = function() {
        model.views.joinViewContainer.innerHTML = '';
        $('.sifter-modal-overlay').hide();
        document.removeEventListener('click', controller.hideJoinView, false);
    }

    this.populateAllFromModel = function() {
        this.populateMapNotesFromModel(false);
        this.populateListNotesFromModel();
    }

    this.createNewNote = function() {
        // first, reset currentNote to clear out any old data, and give it just lat & lon to start
        model.currentNote = {};
        model.currentNote.lat = MAP_CENTER_LATITUDE;
        model.currentNote.lon = MAP_CENTER_LONGITUDE;

        var gameId = model.gameId;
        var playerId = model.playerId;
    }

    this.pushNewNote = function pushNewNote(note) {
        //fifth, finally push the new note to HTML

        var fullNote = note.data[0];
        model.addNoteFromData(fullNote); //add it in to the cached model
        controller.populateAllFromModel(); //re-display the map and left hand images
        document.getElementById('message').style.display = 'none';
        controller.noteSelected({note: fullNote}); //show the new note
    }

    // New, simpler note upload function
    this.oneStepNote = function (theJSON) {
        document.getElementById('messageContent').innerHTML = "Uploading...";
        document.getElementById('message').style.display = 'block';

        function withTheJSON() {
            callAris('notes.createNote', theJSON, function(noteResult) {
                if (noteResult.returnCode === 0) {
                    controller.oneStepGetNote(noteResult.data.note_id);
                } else {
                    var msg = $('#messageContent');
                    msg.text('Upload failed.');
                    var retry = $('<div class="internalLink">Retry</div>');
                    retry.css('margin', '5px');
                    retry.css('font-weight', 'bold');
                    retry.click(function(){
                        document.getElementById('message').style.display = 'none';
                        self.oneStepNote(theJSON);
                    });
                    var cancel = $('<div class="internalLink">Cancel</div>');
                    cancel.css('margin', '5px');
                    cancel.css('font-weight', 'bold');
                    cancel.click(function(){
                        document.getElementById('message').style.display = 'none';
                    });
                    msg.append(retry);
                    msg.append(cancel);
                }
            });
        }

        if (theJSON != null) {
            // this is a retry attempt
            withTheJSON();
        }
        else {
            var gameId = model.gameId;
            var playerId = model.playerId;
            var lat = model.currentNote.lat;
            var lon = model.currentNote.lon;
            var caption = model.currentNote.text;
            var tags = [];
            for (var i = 1; i < model.tags.length + 1; i++) {
                if (document.getElementById("create_tag_" + i).checked) {
                    tags.push(model.tags[i - 1].tag_id);
                }
            };
            var photoReader = new FileReader();
            photoReader.onload = function() {
                var photoData = photoReader.result;
                mime_map = {
                    "jpg": "image/jpeg",
                    "png": "image/png",
                    "gif": "image/gif",
                };
                var photoBase64 = '';
                var photoExt = '';
                for (ext in mime_map) {
                    var dataPrefix = 'data:' + mime_map[ext] + ';base64,';
                    if (photoData.indexOf(dataPrefix) === 0) {
                        photoBase64 = photoData.substring(dataPrefix.length);
                        photoExt = ext;
                        break;
                    }
                }

                theJSON = {
                    auth: getAuthObject(),
                    game_id: gameId,
                    media: {
                        file_name: "upload." + photoExt,
                        data: photoBase64,
                        resize: 640,
                    },
                    description: caption,
                    trigger: {
                        latitude: lat,
                        longitude: lon,
                    },
                    tag_id: tags[0],
                };
                withTheJSON();
            }
            photoReader.readAsDataURL( $('#in-camera')[0].files[0] );
        }
    };
    this.oneStepGetNote = function (note_id) {
        // retrieve the note object back from the server so you can push it to HTML
        callAris("notes.searchNotes", {
            game_id: model.gameId,
            note_id: note_id,
            note_count: 1,
        }, controller.pushNewNote);
    }

    this.addCommentToNote = function(noteId, comment, callback) {
        callAris("note_comments.createNoteComment", {
            game_id: model.gameId,
            auth: getAuthObject(),
            note_id: noteId,
            description: comment,
        }, callback);
    }

    this.deleteNote = function(noteId) {
        callAris("notes.deleteNote", {
            auth: getAuthObject(),
            note_id: noteId,
        }, function() {
            model.deleteNote(noteId);
            controller.populateAllFromModel(); //re-display the map and left hand images
        });
    }

    this.deleteComment = function(noteID, commentID, callback) {
        callAris("note_comments.deleteNoteComment", {
            auth: getAuthObject(),
            note_comment_id: commentID,
        }, function() {
            model.deleteComment(noteID, commentID);
            callback();
        });
    }

    this.editComment = function(noteID, commentID, text, callback) {
        callAris("note_comments.updateNoteComment", {
            auth: getAuthObject(),
            note_comment_id: commentID,
            description: text,
        }, function() {
            model.editComment(noteID, commentID, text);
            callback();
        })
    }

    this.login = function(username, password) {
        callAris("users.logIn", {
            permission: 'read_write',
            user_name: username,
            password: password,
        }, this.loginReturned);
    }

    // TODO: this needs to be updated when aris v2 gets facebook login support
    this.facebookLogin = function(email, displayName, uid) {
        //it is possible for email to be blank
        //callService("players.getFacebookLoginPlayerObject", this.facebookLoginReturned, "/" + email + "/" + displayName + "/" + uid, false);
    }

    this.saveCookies = function() {
        $.cookie("aris-auth", { // this is shared with the Siftr homepage and editor
            user_id: parseInt(model.playerId),
            permission: 'read_write',
            key: model.readWriteKey,
            username: model.displayName,
        }, {path: '/'});
    }

    this.loginReturned = function(obj) {
        // first check to see if you have a valid login
        if (obj.data) {

            // updated the display name and player ID to match getLoginPlayerObject data
            var playerId = obj.data.user_id;
            var displayName = obj.data.display_name; //in new user account creation this will be same as username
            if (!obj.display_name) {
                displayName = obj.data.user_name;
            }; //just in case set it to username if display name is blank

            model.playerId = playerId;
            model.displayName = displayName;
            model.readWriteKey = obj.data.read_write_key;

            if (model.playerId > 0) {
                self.hideLoginView();

                self.saveCookies();
                $('.sifter-show-logout-button').show();

                // this won't be necessary after https://github.com/ARISGames/server/pull/10
                model.checkGameOwners(function(){
                    /* Trigger original item that required login and clear it out */
                    controller.loginCallback();
                    controller.loginCallback = function() {};
                });
            } else {
                alert("Incorrect login. Please try again.");
            }
        } else {
            alert(obj.returnCodeDescription + ". Please try again");
        }
    }

    this.facebookLoginReturned = function(returnString) {
        //be sure to sych changes with this to main loginReturned
        var startJson = returnString.indexOf("{");
        var jsonString = returnString.substr(startJson);
        var obj = JSON.parse(jsonString);

        // first check to see if you have a valid login
        if (obj.data) {

            // updated the display name and player ID to match getLoginPlayerObject data
            var playerId = obj.data.player_id;
            var displayName = obj.data.display_name; //in new user account creation this will be same as username
            if (!obj.display_name) {
                displayName = obj.data.user_name;
            }; //just in case set it to username if display name is blank

            model.playerId = playerId;
            model.displayName = displayName;

            if (model.playerId > 0) {
                self.hideLoginView();

                self.saveCookies();
                $('.sifter-show-logout-button').show();
            } else {
                alert("Incorrect login. Please try again.");
            }
        } else {
            alert(obj.returnCodeDescription + ". Please try again");
        }
    }

    this.logout = function() {
        $.removeCookie('aris-auth', {path: '/'});
        $('.sifter-show-logout-button').hide();
        model.playerId = 0;

    }

    this.logged_in = function() {
        return model.playerId > 0;
    }

    /* Send people back to where they requested the login from */
    this.loginCallback = function() {}

    this.loginRequired = function(callback) {
        if (this.logged_in() === true) {
            callback();
        } else {
            this.loginCallback = callback;
            $('.closable, .sifter-modal-overlay').hide(); /* Close everything */
            this.showLoginView();
        }
    }

    this.createAccount = function(email, password, username) {
        model.displayName = username; /* Because nothing is contained in the callback and we're logging them in */
        callAris("users.createUser", {
            user_name: username,
            password: password,
            email: email,
        }, this.createPlayerReturned);
    }

    this.createPlayerReturned = function(obj) {
        console.log(obj);
        if (obj.returnCode > 0) alert(obj.returnCodeDescription);
        else {
            model.playerId = obj.data.user_id;
            model.displayName = obj.data.display_name;
            model.readWriteKey = obj.data.read_write_key;

            self.saveCookies();
            $('.sifter-show-logout-button').show();

            self.hideLoginView();
            self.hideJoinView();

            /* Trigger original item that required login and clear it out */
            controller.loginCallback();
            controller.loginCallback = function() {};
        }
    }

    this.resetAndEmailPassword = function(email) {
        callAris("users.requestForgotPasswordEmail", {
            email: email,
        }, controller.resetPasswordMessage);
    }

    this.resetPasswordMessage = function(responseMessage) {
        switch (responseMessage.returnCode) {
            case 0:
                alert("A password reset email has been sent if there is a user with that email.");
                controller.hideForgotView();
                break;
            default:
                alert("Couldn't send password reset email.");
                console.log("Unexpected result from resetPasswordMessage: " + responseMessage);
        }
    }

    this.like = function(playerId, noteId, callback) {
        callAris("notes.likeNote", {
            auth: getAuthObject(),
            game_id: model.gameId,
            note_id: noteId,
        }, callback);
    }

    this.unlike = function(playerId, noteId, callback) {
        callAris("notes.unlikeNote", {
            auth: getAuthObject(),
            game_id: model.gameId,
            note_id: noteId,
        }, callback);
    }

    this.sendEmail = function(playerId, noteId) {
        //alert("email" + playerId + noteId);
        note = model.currentNote;
        if (!note.note_id == noteId) //we are making an assumption that the current note is the same as the one desired to email
        { //just in case this is in error, record it    
            console.log("Error in email: " + model.currentNote.note_id + " " + noteId);
        }

        //initialize the text
        var bodyText = "Check out this note about ";
        var subjectText = "Interesting note on ";

        //customize based on the tag
        var tagText = note.tagString;

        bodyText += tagText;
        subjectText += tagText;

        //customize on if they made it or found it      
        if (playerId == note.user_id) bodyText += " I made ";
        else bodyText += " I found ";

        bodyText += "on the UW-Madison Campus: " + "\n";
        subjectText += " from UW-Madison Campus";

        //pull out the note text
        bodyText += "\"" + getTextToUse(note) + "\" \n \n";

        bodyText += "See the whole note at: " + controller.noteURL(noteId);

        //add all the accumulated strings together  
        emailText = "mailto:?subject=" + encodeURIComponent(subjectText) + "&body=" + encodeURIComponent(bodyText);

        //send the email
        window.open(emailText);
    }

    this.showAbout = function() {
        model.views.aboutView = new AboutView();
        model.views.aboutContainer.innerHTML = '';
        model.views.aboutContainer.appendChild(model.views.aboutView.html);
        $('.sifter-modal-overlay').show();
    }

    this.showFilters = function() {
        model.views.filtersView = new FiltersView();
        model.views.filtersContainer.innerHTML = '';
        model.views.filtersContainer.appendChild(model.views.filtersView.html);

        //Need event listeners to be set after the html is actually there
        $('.sifter-filter-checkbox-input').on('change', function() {
            startSift('tags');
        });

        $('.sifter-filter-search-input').on('change', function() {
            startSift('search');
        });
    }

    this.getNoteFromURL = function() {
        var match = window.location.hash.match(/^#(\d+)$/);
        var noteFromHash;
        if (match) {
            for (var i = 0; i < model.gameNotes.length; i++) {
                if (model.gameNotes[i].note_id === match[1]) {
                    noteFromHash = model.gameNotes[i];
                    break;
                }
            }
            if (noteFromHash) {
                var sender = {
                    note: noteFromHash
                };
                controller.noteSelected(sender);
                return;
            } else {
                //else they gave an invalid note_id
            }
        }
        controller.hideNoteView();
        controller.showAboutIfNew();
    };

    this.showAboutIfNew = function() {
        // Show the about page on first launch of a Siftr.
        // Either they came straight to siftr.org/whatever/,
        // or they went to a note hash link and they're now closing it.
        var seenCookie = $.cookie('seen-siftr');
        if (!seenCookie) {
            $.cookie('seen-siftr', {seen: true});
            // the path for this cookie will automatically be siftr.org/some-specific-siftr/
            this.showAbout();
        }
    }

    this.noteURL = function(noteId) {
        return window.location.href.replace(/\#.*/, '') + '#' + noteId;
        // we remove a hash (if there is one) and everything after it
    }

    this.sendTweet = function(playerId, noteId) {
        note = model.currentNote;
        if (!note.note_id == noteId) //we are making an assumption that the current note is the same as the one desired to tweet
        { //just in case this is in error, record it 
            console.log("Error in tweet: " + model.currentNote.note_id + " " + noteId);
        }
        //different versions of siftr will have different URLs
        currentURL = window.location.href;

        //initialize the text
        var bodyText = "Check out this note about ";

        //customize based on the tag
        bodyText += note.tagString;

        //customize on if they made it or found it      
        if (playerId == note.owner_id) bodyText += " I made ";
        else bodyText += " I found ";

        bodyText += "on the UW-Madison Campus:";

        noteURL = controller.noteURL(noteId);
        tweetURL = "https://twitter.com/share?&url=" + encodeURIComponent(noteURL) + "&text=" + encodeURIComponent(bodyText);

        //open window to send tweet
        window.open(tweetURL);

        //add one to tweet count and increment the user side HTML
        note.tweets ? note.tweets = parseInt(note.tweets, 10) + 1 : note.tweets = 1;
    };


    this.getPinLink = function(playerId, noteId) {
        note = model.currentNote;
        if (!note.note_id == noteId) //we are making an assumption that the current note is the same as the one desired to pin
        { //just in case this is in error, record it 
            console.log("Error in pin: " + model.currentNote.note_id + " " + noteId);
        }

        //different versions of siftr will have different URLs
        currentURL = window.location.href;

        //initialize the text
        var pinDescr = "Interesting note on ";

        //customize based on the tag
        pinDescr += note.tagString;

        //customize on if they made it or found it      
        if (playerId == note.owner_id) pinDescr += " I made ";
        else pinDescr += " I found ";

        pinDescr += "on the UW-Madison Campus: " + currentURL + "#" + model.currentNote.note_id;
        var pinLink = "";


        //TODO: keeping text, audi, and image for now because might be able to embed them in pin
        var pinText = "\"" + note.description + "\" \n \n";
        var pinImage = note.media.data.url;

        console.log(pinImage);

        //assemble link for pinterest button
        pinLink += "http://www.pinterest.com/pin/create/button/";
        pinLink += "?url=" + encodeURIComponent(currentURL + "#" + model.currentNote.note_id);
        pinLink += '&media=' + encodeURIComponent(pinImage);
        pinLink += '&description=' + encodeURIComponent(pinDescr);


        //add one to pin count and increment the user side HTML
        // note.pins ? note.pins = parseInt(note.pins, 10) + 1 : note.pins = 1;
        console.log(pinLink);
        window.open(pinLink);

    };

    this.editDescription = function(noteId, description) {
        callAris('notes.updateNote', {
            auth: getAuthObject(),
            note_id: noteId,
            description: description,
        }, function(data) {
            if (data.returnCode === 0) {
                model.currentNote.description = description;
                controller.noteSelected({note: model.currentNote});
            } else {
                // TODO
            }
        });
    };
}
