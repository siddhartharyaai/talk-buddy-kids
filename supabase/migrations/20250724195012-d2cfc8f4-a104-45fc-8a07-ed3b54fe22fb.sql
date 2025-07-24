-- Create storage bucket for content
INSERT INTO storage.buckets (id, name, public) VALUES ('content', 'content', true);

-- Create storage policies for content bucket
CREATE POLICY "Content files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'content');

CREATE POLICY "Admin can upload content files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'content');

CREATE POLICY "Admin can update content files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'content');

CREATE POLICY "Admin can delete content files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'content');