export type Profile = { id: string; name: string; favorites: string[] }
export type Vault = { profiles: Profile[]; active: string }

export function toggleFavorite(vault: Vault, id: string): Vault {
  return {
    ...vault,
    profiles: vault.profiles.map((profile) =>
      profile.id === vault.active
        ? {
            ...profile,
            favorites: profile.favorites.includes(id)
              ? profile.favorites.filter((favorite) => favorite !== id)
              : [...profile.favorites, id]
          }
        : profile
    )
  }
}
