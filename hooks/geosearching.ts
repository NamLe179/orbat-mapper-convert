/**
 * Chức năng: Tìm kiếm địa điểm (Geocoding) qua Photon/Komoot API
 */

import { useState, useCallback } from "react";
import type { Feature, FeatureCollection, Point } from "geojson";
import type { GeoSearchProperties, PhotonFeatureProperties } from "@/types/search";

export interface GeoSearchOptions {
  mapCenter?: number[] | null;
  limit?: number;
  lang?: string;
}

export type PhotonSearchResult = Feature<Point, GeoSearchProperties>;

// photonSearch(query) trả về danh sách địa điểm với coordinates
export function useGeoSearch() {
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const photonSearch = useCallback(async (
    q: string,
    options: GeoSearchOptions = {},
  ): Promise<PhotonSearchResult[]> => {
    const { mapCenter, limit = 10, lang = "en" } = options;

    setIsFetching(true);
    setError(null);

    try {
      // Sử dụng URL object để construct query string chuẩn xác hơn
      const url = new URL("https://photon.komoot.io/api/");
      url.searchParams.append("q", q);
      url.searchParams.append("limit", limit.toString());
      url.searchParams.append("lang", lang);

      if (mapCenter) {
        const [lon, lat] = mapCenter;
        url.searchParams.append("lon", lon.toString());
        url.searchParams.append("lat", lat.toString());
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }

      const data: FeatureCollection<Point, PhotonFeatureProperties> = await response.json();

      if (data && data.features) {
        return data.features.map((item) => {
          return {
            ...item,
            properties: {
              name: item.properties.name,
              country: item.properties.country,
              city: item.properties.city,
              state: item.properties.state,
              extent: item.properties.extent,
              category: item.properties.osm_key, // Map osm_key to category
            },
          } as PhotonSearchResult;
        });
      }
      
      return [];

    } catch (err) {
      console.error("GeoSearch Error:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      return [];
    } finally {
      setIsFetching(false);
    }
  }, []);

  return { isFetching, photonSearch, error };
}