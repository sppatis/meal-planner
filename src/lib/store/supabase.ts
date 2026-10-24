import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type { Ingredient, MealSlot, Photo, Plan, Recipe } from "@/lib/types";
import type { Store } from "./types";

const BUCKET = "photos";

let client: SupabaseClient | null = null;

function db() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

interface PhotoRow {
  id: string;
  recipe_slug: string;
  storage_path: string;
  created_at: string;
}

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    recipeSlug: row.recipe_slug,
    url: db().storage.from(BUCKET).getPublicUrl(row.storage_path).data.publicUrl,
    createdAt: row.created_at,
  };
}

export const supabaseStore: Store = {
  async getPlans() {
    const rows = check(await db().from("plans").select("data")) as { data: Plan }[];
    return rows.map((r) => r.data).sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
  async savePlan(plan) {
    check(await db().from("plans").upsert({ id: plan.id, data: plan }));
  },
  async deletePlan(id) {
    check(await db().from("meal_slots").delete().eq("plan_id", id));
    check(await db().from("plans").delete().eq("id", id));
    if ((await supabaseStore.getActivePlanId()) === id) check(await db().from("settings").delete().eq("key", "active_plan_id"));
  },
  async getActivePlanId() {
    const row = check(await db().from("settings").select("value").eq("key", "active_plan_id").maybeSingle()) as {
      value: string;
    } | null;
    return row?.value ?? null;
  },
  async setActivePlanId(id) {
    check(await db().from("settings").upsert({ key: "active_plan_id", value: id }));
  },

  async getSlots(planId) {
    const rows = check(
      await db().from("meal_slots").select("date, role, recipe_slug").eq("plan_id", planId).order("date"),
    ) as { date: string; role: MealSlot["role"]; recipe_slug: string }[];
    return rows.map((r) => ({ date: r.date, role: r.role, recipeSlug: r.recipe_slug }));
  },
  async replaceSlots(planId, dates, slots) {
    if (dates.length) check(await db().from("meal_slots").delete().eq("plan_id", planId).in("date", dates));
    if (slots.length) {
      check(
        await db()
          .from("meal_slots")
          .upsert(slots.map((s) => ({ plan_id: planId, date: s.date, role: s.role, recipe_slug: s.recipeSlug }))),
      );
    }
  },
  async setSlotRecipe(planId, date, recipeSlug) {
    check(
      await db().from("meal_slots").update({ recipe_slug: recipeSlug }).eq("plan_id", planId).eq("date", date),
    );
  },

  async getRatings() {
    const rows = check(await db().from("ratings").select("recipe_slug, stars")) as {
      recipe_slug: string;
      stars: number;
    }[];
    return Object.fromEntries(rows.map((r) => [r.recipe_slug, r.stars]));
  },
  async setRating(recipeSlug, stars) {
    check(
      await db()
        .from("ratings")
        .upsert({ recipe_slug: recipeSlug, stars, updated_at: new Date().toISOString() }),
    );
  },

  async getFavourites() {
    const rows = check(await db().from("favourites").select("recipe_slug")) as {
      recipe_slug: string;
    }[];
    return rows.map((r) => r.recipe_slug);
  },
  async setFavourite(recipeSlug, favourite) {
    if (favourite) check(await db().from("favourites").upsert({ recipe_slug: recipeSlug }));
    else check(await db().from("favourites").delete().eq("recipe_slug", recipeSlug));
  },

  async getPhotos(recipeSlug) {
    let query = db().from("photos").select("*").order("created_at", { ascending: false });
    if (recipeSlug) query = query.eq("recipe_slug", recipeSlug);
    return (check(await query) as PhotoRow[]).map(toPhoto);
  },
  async addPhoto(recipeSlug, file) {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const storagePath = `${recipeSlug}/${randomUUID()}.${ext}`;
    check(
      await db()
        .storage.from(BUCKET)
        .upload(storagePath, await file.arrayBuffer(), { contentType: file.type || "image/jpeg" }),
    );
    const row = check(
      await db()
        .from("photos")
        .insert({ recipe_slug: recipeSlug, storage_path: storagePath })
        .select()
        .single(),
    ) as PhotoRow;
    return toPhoto(row);
  },
  async deletePhoto(id) {
    const row = check(await db().from("photos").select("*").eq("id", id).maybeSingle()) as PhotoRow | null;
    if (!row) return;
    check(await db().storage.from(BUCKET).remove([row.storage_path]));
    check(await db().from("photos").delete().eq("id", id));
  },

  async getPriceOverrides() {
    const rows = check(await db().from("price_overrides").select("ingredient_id, price")) as {
      ingredient_id: string;
      price: number;
    }[];
    return Object.fromEntries(rows.map((r) => [r.ingredient_id, Number(r.price)]));
  },
  async setPriceOverride(ingredientId, price) {
    if (price === null) {
      check(await db().from("price_overrides").delete().eq("ingredient_id", ingredientId));
    } else {
      check(await db().from("price_overrides").upsert({ ingredient_id: ingredientId, price }));
    }
  },

  async getCustomRecipes() {
    const rows = check(await db().from("custom_recipes").select("data").order("updated_at")) as { data: Recipe }[];
    return rows.map((r) => r.data);
  },
  async saveCustomRecipe(recipe) {
    check(
      await db()
        .from("custom_recipes")
        .upsert({ slug: recipe.slug, data: recipe, updated_at: new Date().toISOString() }),
    );
  },
  async deleteCustomRecipe(slug) {
    check(await db().from("custom_recipes").delete().eq("slug", slug));
  },

  async getCustomIngredients() {
    const rows = check(await db().from("custom_ingredients").select("data")) as { data: Ingredient }[];
    return rows.map((r) => r.data);
  },
  async saveCustomIngredient(ingredient) {
    check(await db().from("custom_ingredients").upsert({ id: ingredient.id, data: ingredient }));
  },
};
