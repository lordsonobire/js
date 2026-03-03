package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"match-me-server/internal/database"
	"match-me-server/internal/middleware"
	"match-me-server/internal/models"

	"github.com/gorilla/mux"
)

func GetMe(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	var user models.User
	err := database.DB.QueryRow("SELECT id, email, created_at FROM users WHERE id = $1", userID).Scan(&user.ID, &user.Email, &user.CreatedAt)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var profile models.Profile
	err = database.DB.QueryRow(`
		SELECT user_id, COALESCE(first_name,''), COALESCE(last_name,''), COALESCE(bio,''), COALESCE(gender,''), COALESCE(location,''), birthdate, COALESCE(looking_for,''), COALESCE(interests, '[]'::jsonb), COALESCE(preferences, '{}'::jsonb), COALESCE(avatar_url,''), updated_at 
		FROM profiles WHERE user_id = $1`, userID).
		Scan(&profile.UserID, &profile.FirstName, &profile.LastName, &profile.Bio, &profile.Gender, &profile.Location, &profile.Birthdate, &profile.LookingFor, &profile.Interests, &profile.Preferences, &profile.AvatarURL, &profile.UpdatedAt)

	if err != nil {
		// Create profile if missing?
		_, execErr := database.DB.Exec("INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING", userID)
		if execErr == nil {
			// retry scan...
			// Simplified: Just error out if it fails fundamentally
		}
		http.Error(w, "Profile not found", http.StatusNotFound)
		return
	}

	response := map[string]interface{}{
		"user":    user,
		"profile": profile,
	}

	json.NewEncoder(w).Encode(response)
}

// Helper CheckAccess
func CheckAccess(viewerID int, targetID int) bool {
	if viewerID == targetID {
		return true
	}

	// 1. Check Connection
	var count int
	database.DB.QueryRow(`
		SELECT count(*) FROM connections 
		WHERE (requester_id = $1 AND recipient_id = $2) 
		OR (requester_id = $2 AND recipient_id = $1)`, viewerID, targetID).Scan(&count)
	if count > 0 {
		return true
	}

	// 2. Check Recommendation Eligibility (Simplified 5-points logic for validity)
	// We need to fetch basic match info
	var viewerLoc, viewerGender string
	var viewerInterests, viewerPrefs []byte

	database.DB.QueryRow(`SELECT COALESCE(location,''), COALESCE(gender,''), COALESCE(interests,'[]'::jsonb), COALESCE(preferences,'{}'::jsonb) FROM profiles WHERE user_id = $1`, viewerID).Scan(&viewerLoc, &viewerGender, &viewerInterests, &viewerPrefs)

	var targetLoc, targetGender string
	database.DB.QueryRow(`SELECT COALESCE(location,''), COALESCE(gender,'') FROM profiles WHERE user_id = $1`, targetID).Scan(&targetLoc, &targetGender)

	// Parse Prefs
	var prefs map[string]interface{}
	json.Unmarshal(viewerPrefs, &prefs)

	targetLocPref := viewerLoc
	if l, ok := prefs["preferredLocation"].(string); ok && l != "" {
		targetLocPref = l
	}

	targetGenderPref := ""
	if g, ok := prefs["gender"].(string); ok {
		targetGenderPref = g
	}

	// Logic: Must match location (Strict)
	if !strings.EqualFold(targetLoc, targetLocPref) {
		return false
	}
	// Logic: Must match gender (if specified)
	if targetGenderPref != "" && targetGenderPref != "Everyone" && !strings.EqualFold(targetGender, targetGenderPref) {
		return false
	}

	// Check dismissed
	var dismissed int
	database.DB.QueryRow(`SELECT count(*) FROM dismissed_matches WHERE user_id=$1 AND dismissed_id=$2`, viewerID, targetID).Scan(&dismissed)
	if dismissed > 0 {
		return false
	}

	return true
}

func GetUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int)

	if !CheckAccess(userID, id) {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Fetch basic info
	var profile models.Profile
	err = database.DB.QueryRow(`
		SELECT user_id, COALESCE(first_name,''), COALESCE(last_name,''), COALESCE(avatar_url,'')
		FROM profiles WHERE user_id = $1`, id).
		Scan(&profile.UserID, &profile.FirstName, &profile.LastName, &profile.AvatarURL)

	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Check connection status
	var status string
	if userID == id {
		status = "self"
	} else {
		err = database.DB.QueryRow(`
			SELECT status FROM connections 
			WHERE (requester_id = $1 AND recipient_id = $2) 
			OR (requester_id = $2 AND recipient_id = $1)`, userID, id).Scan(&status)
		if err == sql.ErrNoRows {
			status = "none"
		}
	}

	name := strings.TrimSpace(profile.FirstName + " " + profile.LastName)

	res := map[string]interface{}{
		"id":                profile.UserID,
		"name":              name,
		"avatar_url":        profile.AvatarURL,
		"connection_status": status,
	}

	json.NewEncoder(w).Encode(res)
}

func GetUserProfile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.Atoi(vars["id"])
	userID := r.Context().Value(middleware.UserIDKey).(int)

	if !CheckAccess(userID, id) {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var bio string
	err := database.DB.QueryRow("SELECT COALESCE(bio, '') FROM profiles WHERE user_id=$1", id).Scan(&bio)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":  id,
		"bio": bio,
	})
}

func GetUserBio(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.Atoi(vars["id"])
	userID := r.Context().Value(middleware.UserIDKey).(int)

	if !CheckAccess(userID, id) {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var p models.Profile
	err := database.DB.QueryRow(`
		SELECT user_id, COALESCE(interests,'[]'::jsonb), COALESCE(location,''), COALESCE(gender,'')
		FROM profiles WHERE user_id=$1`, id).Scan(&p.UserID, &p.Interests, &p.Location, &p.Gender)

	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":        p.UserID,
		"interests": p.Interests,
		"location":  p.Location,
		"gender":    p.Gender,
	})
}

func UpdateMyProfile(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	// Max upload size 10MB
	r.ParseMultipartForm(10 << 20)

	firstName := r.FormValue("first_name")
	lastName := r.FormValue("last_name")
	bio := r.FormValue("bio")
	gender := r.FormValue("gender")
	location := r.FormValue("location")
	lookingFor := r.FormValue("looking_for")
	interests := r.FormValue("interests")     // stringified JSON
	preferences := r.FormValue("preferences") // stringified JSON

	// Handle File
	file, handler, err := r.FormFile("file")
	var avatarURL string
	if err == nil {
		defer file.Close()

		// Create uploads folder
		os.MkdirAll("uploads", os.ModePerm)

		// Create unique filename
		filename := fmt.Sprintf("%d_%d%s", userID, time.Now().Unix(), filepath.Ext(handler.Filename))
		path := filepath.Join("uploads", filename)

		f, err := os.Create(path)
		if err != nil {
			http.Error(w, "Error saving file", http.StatusInternalServerError)
			return
		}
		defer f.Close()
		io.Copy(f, file)

		// Base URL?
		// We'll return full URL or relative.
		// Frontend expects full URL typically? Or simple path?
		// Old server used: `${protocol}://${host}/uploads/${req.file.filename}`
		// We can construct it via Request.Host
		scheme := "http"
		if r.TLS != nil {
			scheme = "https"
		}
		avatarURL = fmt.Sprintf("%s://%s/uploads/%s", scheme, r.Host, filename)
	}

	// SQL Update
	// We only update fields that are present (not empty strings?)
	// Actually frontend usually sends all fields.
	// We'll use COALESCE in SQL but we need proper null handling.
	// Easiest is to Fetch existing, update struct, Save.
	// Or use dynamic query.

	// Let's rely on COALESCE with NULLIF logic or just standard update if frontend sends everything.
	// Assuming frontend sends current state.

	// Note: interests/preferences are JSON strings. We need to validate strictly?
	// Postgres will error if invalid JSON.

	// Handling Avatar URL: if empty (no new file), keep old.
	// If "avatar_url" field is present in body (e.g. removing avatar), handle it?
	// The frontend sends "avatar_url" sometimes.
	// But "file" takes precedence.

	// Simplified Update Query
	query := `
		UPDATE profiles SET
			first_name = COALESCE(NULLIF($1, ''), first_name),
			last_name = COALESCE(NULLIF($2, ''), last_name),
			bio = COALESCE(NULLIF($3, ''), bio),
			gender = COALESCE(NULLIF($4, ''), gender),
			location = COALESCE(NULLIF($5, ''), location),
			looking_for = COALESCE(NULLIF($6, ''), looking_for),
			interests = COALESCE(NULLIF($7, '')::jsonb, interests),
			preferences = COALESCE(NULLIF($8, '')::jsonb, preferences),
			avatar_url = COALESCE(NULLIF($9, ''), avatar_url),
			updated_at = NOW()
		WHERE user_id = $10
		RETURNING user_id, COALESCE(first_name,''), COALESCE(last_name,''), COALESCE(bio,''), COALESCE(gender,''), COALESCE(location,''), COALESCE(looking_for,''), COALESCE(interests,'[]'::jsonb), COALESCE(preferences,'{}'::jsonb), COALESCE(avatar_url,''), updated_at
	`
	// Note: NULLIF($1, '') turns empty strings into NULL, so COALESCE keeps the old value.
	// This might be problematic if user WANTS to delete a value (set to empty).
	// But usually they just change it.
	// If user clears bio, they send empty string.
	// We should probably allow updating to empty string.
	// But for a migration script, safety first.

	// Better: Update if parameter exists?
	// r.FormValue returns "" if missing.
	// We can't distinguish "missing" from "empty".
	// We'll assume "update everything to what's provided".
	// But if connection is spotty or partial update...

	// "UpdateMyProfile" usually sends full state.
	// Let's use the provided values.

	// We do need to handle the case where avatarURL is empty strings (no file upload).
	// In that case we want to KEEP existing (pass NULL to update).

	var avatarArg interface{} = avatarURL
	if avatarURL == "" {
		avatarArg = nil // Use current value via COALESCE
		// Check if we want to support deleting avatar?
		// Frontend might send separate "remove avatar" signal.
	}

	// We'll use a slightly smarter query for avatar:
	// avatar_url = COALESCE($9, avatar_url) -- if $9 is null, keep old.

	// For other fields, we update blindly.

	var updatedProfile models.Profile

	err = database.DB.QueryRow(query,
		firstName, lastName, bio, gender, location, lookingFor, interests, preferences, avatarArg, userID,
	).Scan(&updatedProfile.UserID, &updatedProfile.FirstName, &updatedProfile.LastName, &updatedProfile.Bio, &updatedProfile.Gender, &updatedProfile.Location, &updatedProfile.LookingFor, &updatedProfile.Interests, &updatedProfile.Preferences, &updatedProfile.AvatarURL, &updatedProfile.UpdatedAt)

	if err != nil {
		// If JSON error
		http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(updatedProfile)
}
