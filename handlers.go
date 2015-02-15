package main

import (
	"net/http"
	"github.com/julienschmidt/httprouter"
)

func Index (w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	http.ServeFile(w, r, "views/index.html")
}

func Static (w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	http.ServeFile(w, r, "static" + params.ByName("filename"))
}

func NewVideo (w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	
}
