"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "agent-mart-starred-repos";

/**
 * Hook for managing starred repositories in localStorage
 * Provides persistence across sessions for user's starred repos
 */
export function useStarredRepos() {
  const [starredRepos, setStarredRepos] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load starred repos from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- loading initial state from localStorage on mount
        setStarredRepos(new Set(parsed));
      }
    } catch (err) {
      console.error("Failed to load starred repos:", err);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever starredRepos changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(starredRepos)));
    } catch (err) {
      console.error("Failed to save starred repos:", err);
    }
  }, [starredRepos, isLoaded]);

  const isStarred = useCallback(
    (repoId: string): boolean => starredRepos.has(repoId),
    [starredRepos]
  );

  const toggleStar = useCallback((repoId: string) => {
    setStarredRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  }, []);

  const addStar = useCallback((repoId: string) => {
    setStarredRepos((prev) => new Set(prev).add(repoId));
  }, []);

  const removeStar = useCallback((repoId: string) => {
    setStarredRepos((prev) => {
      const next = new Set(prev);
      next.delete(repoId);
      return next;
    });
  }, []);

  return {
    starredRepos,
    isStarred,
    toggleStar,
    addStar,
    removeStar,
    isLoaded,
  };
}
