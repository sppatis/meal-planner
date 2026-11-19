"use client";

import { createContext, useContext, useMemo } from "react";
import { BUILTIN_LIBRARY, buildLibrary, type Library } from "@/lib/library";
import type { Ingredient, Recipe } from "@/lib/types";

const LibraryContext = createContext<Library>(BUILTIN_LIBRARY);

interface Props {
  recipes: Recipe[];
  ingredients: Ingredient[];
  /** Built-in recipes this household has saved over the catalogue. */
  saved?: Recipe[];
  children: React.ReactNode;
}

export function LibraryProvider({ recipes, ingredients, saved = [], children }: Props) {
  const library = useMemo(() => buildLibrary(recipes, ingredients, saved), [recipes, ingredients, saved]);
  return <LibraryContext value={library}>{children}</LibraryContext>;
}

export function useLibrary() {
  return useContext(LibraryContext);
}
