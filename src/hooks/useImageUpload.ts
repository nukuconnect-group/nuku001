import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadImages = async (files: File[]): Promise<string[]> => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const urls: string[] = [];

      for (const file of files) {
        const ext = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await supabase.storage
          .from("product-images")
          .upload(fileName, file, { cacheControl: "3600", upsert: false });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        urls.push(publicUrl);
      }

      return urls;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImages, uploading };
}
