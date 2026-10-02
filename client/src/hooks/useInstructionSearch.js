/**
 * useInstructionSearch — debounced search against /api/instructions/search, shared by
 * the client overview pages and the per-client instruction lists.
 *
 * Only the latest search may update state: a slow response for a partial term
 * (e.g. "SEP") is discarded once the user has typed further (e.g. "SEP 92").
 *
 * @param {string} initialQuery  pre-filled search text (e.g. carried over via navigation)
 * @param {string|number} [clientId]  restrict matches to one client
 *
 * @returns {{
 *   query:       string,                 // live input value
 *   setQuery:    (q: string) => void,
 *   isSearching: boolean,                // a (debounced) search term is active
 *   results:     SearchResult[] | null,  // null until the active search has returned
 *   matchedKeys: Set<string> | null,     // m1keys of results, for filtering loaded lists
 *   loading:     boolean,              // active search awaiting its response
 *   error:       string | null,
 *   retry:       () => void,          // re-run the current search after an error
 * }}
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../api.js";

const DEBOUNCE_MS = 400;

export function useInstructionSearch(initialQuery = "", clientId) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  // Each response is tagged with the term it answers; anything for another term is ignored.
  const [response, setResponse] = useState({ term: null, rows: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Clearing takes effect immediately; only typing is debounced.
    if (!query.trim()) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const term = debouncedQuery.trim();

  useEffect(() => {
    if (!term) return;

    let cancelled = false;

    const runSearch = async () => {
      try {
        const params = new URLSearchParams({ q: term });
        if (clientId) params.append("clientId", clientId);
        const res = await api.get(`/api/instructions/search?${params}`);
        if (!cancelled) setResponse({ term, rows: res.data || [], error: null });
      } catch (err) {
        console.error("Error running instruction search", err);
        if (!cancelled) setResponse({ term, rows: null, error: "Search failed. Please try again." });
      }
    };

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [term, clientId, attempt]);

  const isSearching = term !== "";
  const current = isSearching && response.term === term ? response : null;
  const results = current ? current.rows : null;
  const error = current ? current.error : null;
  const loading = isSearching && !current;

  const matchedKeys = useMemo(
    () => (results ? new Set(results.map((r) => String(r.m1key))) : null),
    [results]
  );

  const retry = useCallback(() => {
    setResponse({ term: null, rows: null, error: null });
    setAttempt((n) => n + 1);
  }, []);

  return { query, setQuery, isSearching, results, matchedKeys, loading, error, retry };
}
