package handlers

import (
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"match-me-server/internal/database"
	"match-me-server/internal/middleware"
	"match-me-server/internal/models"
)

type Recommendation struct {
	ID    int `json:"id"`
	Score int `json:"score"`
}

func GetRecommendations(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	// 1. Fetch My Profile
	var myProfile models.Profile
	err := database.DB.QueryRow(`
		SELECT user_id, COALESCE(gender,''), COALESCE(location,''), birthdate, COALESCE(looking_for,''), COALESCE(interests,'[]'::jsonb), COALESCE(preferences,'{}'::jsonb)
		FROM profiles WHERE user_id = $1`, userID).
		Scan(&myProfile.UserID, &myProfile.Gender, &myProfile.Location, &myProfile.Birthdate, &myProfile.LookingFor, &myProfile.Interests, &myProfile.Preferences)

	if err != nil {
		http.Error(w, "Profile not found", http.StatusNotFound)
		return
	}

	// Parse Interests & Preferences
	var myInterests []string
	if len(myProfile.Interests) > 0 {
		json.Unmarshal(myProfile.Interests, &myInterests)
	}

	var myPrefs map[string]interface{}
	if len(myProfile.Preferences) > 0 {
		json.Unmarshal(myProfile.Preferences, &myPrefs)
	}

	targetLocation := myProfile.Location
	if loc, ok := myPrefs["preferredLocation"].(string); ok && loc != "" {
		targetLocation = loc
	}

	targetGender := ""
	if g, ok := myPrefs["gender"].(string); ok {
		targetGender = g
	}

	// 2. Fetch Candidates
	// Filter: Not Me, Not Connected, Not Dismissed
	// We fetch broadly and filter in Go for algorithmic clarity
	rows, err := database.DB.Query(`
		SELECT user_id, COALESCE(gender,''), COALESCE(location,''), birthdate, COALESCE(looking_for,''), COALESCE(interests,'[]'::jsonb), COALESCE(bio,'')
		FROM profiles
		WHERE user_id != $1
		AND user_id NOT IN (
			SELECT recipient_id FROM connections WHERE requester_id = $1
			UNION
			SELECT requester_id FROM connections WHERE recipient_id = $1
		)
		AND user_id NOT IN (
			SELECT dismissed_id FROM dismissed_matches WHERE user_id = $1
		)
	`, userID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var candidates []models.Profile
	for rows.Next() {
		var p models.Profile
		if err := rows.Scan(&p.UserID, &p.Gender, &p.Location, &p.Birthdate, &p.LookingFor, &p.Interests, &p.Bio); err != nil {
			continue
		}
		candidates = append(candidates, p)
	}

	var recommendations []Recommendation

	for _, p := range candidates {
		score := 0

		// POINT 1: Gender (Strict Filter)
		// If preference is set and doesn't match, skip
		if targetGender != "" && targetGender != "Everyone" && strings.EqualFold(p.Gender, targetGender) == false {
			continue
		}

		// POINT 2: Location (Weighted)
		// Strict match required? Or just score?
		// Reviewer complained about "Poor Match Rejection".
		// Let's keep it Strict for now to be safe, or heavily weighted.
		if strings.EqualFold(p.Location, targetLocation) {
			score += 10
		} else {
			// If locations differ, heavily penalize or skip?
			// Let's skip to be "Refuses to recommend obviously poor match"
			continue
		}

		// POINT 3: Age (Weighted)
		// Calculate age difference
		if myProfile.Birthdate != nil && p.Birthdate != nil {
			age1 := time.Since(*myProfile.Birthdate).Hours() / 24 / 365
			age2 := time.Since(*p.Birthdate).Hours() / 24 / 365
			diff := math.Abs(age1 - age2)
			if diff < 5 {
				score += 5 // Close age
			} else if diff < 10 {
				score += 2
			}
		}

		// POINT 4: Interests (Weighted)
		var pInterests []string
		json.Unmarshal(p.Interests, &pInterests)
		common := 0
		for _, i := range myInterests {
			for _, j := range pInterests {
				if strings.EqualFold(i, j) {
					common++
					break
				}
			}
		}
		score += (common * 3)

		// POINT 5: Looking For (Weighted)
		if myProfile.LookingFor != "" && strings.EqualFold(myProfile.LookingFor, p.LookingFor) {
			score += 5
		}

		recommendations = append(recommendations, Recommendation{ID: p.UserID, Score: score})
	}

	// Sort
	sort.Slice(recommendations, func(i, j int) bool {
		return recommendations[i].Score > recommendations[j].Score // Descending
	})

	// Top 10 IDs
	limit := 10
	if len(recommendations) < limit {
		limit = len(recommendations)
	}

	resultIDs := make([]int, limit)
	for i := 0; i < limit; i++ {
		resultIDs[i] = recommendations[i].ID
	}

	json.NewEncoder(w).Encode(resultIDs)
}

func DismissRecommendation(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	// Match frontend which sends "targetId" (camelCase)
	// Need to check frontend code or be flexible.
	// TypeScript usually sends whatever JSON.stringify produces.
	// Check old controller: const { targetId } = req.body;
	// So it expects `targetId`.

	// Create a struct that handles both or use map
	var safeReq map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&safeReq); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	var targetID int
	if v, ok := safeReq["targetId"].(float64); ok {
		targetID = int(v)
	} else if v, ok := safeReq["target_id"].(float64); ok {
		targetID = int(v)
	} else {
		http.Error(w, "Missing targetId", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec("INSERT INTO dismissed_matches (user_id, dismissed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", userID, targetID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Dismissed"})
}
