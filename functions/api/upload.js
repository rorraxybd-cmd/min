<!-- ... existing code ... -->
  try {
    const url = new URL(request.url);
    const bucketType = url.searchParams.get("type") || "image"; // 'image' অথবা 'video'
    
    // R2 বাকেট বাইন্ডিং সিলেক্ট করা
    const targetBucket = bucketType === "video" ? env.video : env.image;

    if (!targetBucket) {
      return new Response(JSON.stringify({ success: false, error: `R2 Bucket for '${bucketType}' is not bound.` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const contentTypeHeader = request.headers.get("Content-Type") || (bucketType === "video" ? "video/mp4" : "image/jpeg");
    let ext = bucketType === "video" ? "mp4" : "jpg";
    if (contentTypeHeader.includes("png")) ext = "png";
    else if (contentTypeHeader.includes("webp")) ext = "webp";
    else if (contentTypeHeader.includes("gif")) ext = "gif";
    else if (contentTypeHeader.includes("mp4")) ext = "mp4";
    else if (contentTypeHeader.includes("webm")) ext = "webm";

    const rawOriginalName = request.headers.get("X-File-Name") || `file_${Date.now()}.${ext}`;
    const sanitizedName = rawOriginalName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const fileName = `${Date.now()}_${sanitizedName}`;
    
    // রিকোয়েস্ট বডি থেকে সরাসরি বাইনারি ডেটা রিড করা
    const fileBuffer = await request.arrayBuffer();

    if (!fileBuffer || fileBuffer.byteLength === 0) {
      return new Response(JSON.stringify({ success: false, error: "No file uploaded or empty buffer" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // R2-এ ফাইল পুট করা
    await targetBucket.put(fileName, fileBuffer, {
      httpMetadata: {
        contentType: contentTypeHeader,
      },
    });

    // কাস্টম ডোমেইন অনুযায়ী সঠিক পাবলিক লিংক তৈরি
    const domainMap = {
      image: "https://img.rorraxy.com",
      video: "https://vid.rorraxy.com"
    };

    const fileUrl = `${domainMap[bucketType] || "https://img.rorraxy.com"}/${fileName}`;

    return new Response(JSON.stringify({ 
      success: true, 
      message: "File uploaded to R2 successfully!", 
      url: fileUrl,
      file_name: fileName
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
// ... existing code ...
