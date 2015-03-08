package main

import (
	"net/http"
	"log"
	"github.com/julienschmidt/httprouter"
)

func main() {
	router := httprouter.New()
	router.GET("/", Index)
	router.GET("/static/*filename", Static)
	router.GET("/new/:id", New)
	router.GET("/args/:id", GetArgs)

	log.Fatal(http.ListenAndServe(":8080", router))
}
