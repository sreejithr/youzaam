package main

import (
	"fmt"
	"net/http"
	"encoding/json"
	"github.com/julienschmidt/httprouter"
)

func Index (w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	http.ServeFile(w, r, "views/index.html")
}

func Static (w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	http.ServeFile(w, r, "static" + params.ByName("filename"))
}

func New (w http.ResponseWriter, r *http.Request, params httprouter.Params) {
//	id := params.ByName("id")

	// TODO: Check for cached results. If any, send.

	// Receive message and route to corresponding func:
	// a) ExtractYTConfig (id string) y YTConfig
	// b) SaveMP3 (contents io.Reader) err Error
	// c) GetSong (id string, start float32, end float32) song Song
}

func GetArgs (w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	id := params.ByName("id")

	// Get Youtube args
	youtubeURL := GetYoutubeURL(id)
	youtubeArgs, _ := json.Marshal(GetYoutubeArgs(youtubeURL))

	fmt.Fprintln(w, string(youtubeArgs))
}
