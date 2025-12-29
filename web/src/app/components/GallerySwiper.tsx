"use client";

interface GallerySwiperProps {
    galleryUrls: string[];
}

// Simple CSS scroll gallery with download functionality
const GallerySwiper = ({ galleryUrls }: GallerySwiperProps) => {
    // Download single image
    const handleDownload = async (url: string, index: number) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `garo-gallery-${index + 1}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            // Fallback: open in new tab if download fails (CORS)
            window.open(url, '_blank');
        }
    };

    // Download all images
    const handleDownloadAll = () => {
        galleryUrls.forEach((url, index) => {
            setTimeout(() => {
                handleDownload(url, index);
            }, index * 500); // Stagger downloads to avoid browser blocking
        });
    };

    return (
        <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 relative">
            {/* CSS Scroll Gallery */}
            <div
                className="flex overflow-x-auto snap-x snap-mandatory h-full w-full scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {galleryUrls.map((url, index) => (
                    <div
                        key={index}
                        className="flex-shrink-0 w-full h-full snap-center relative group"
                    >
                        <img
                            src={url}
                            alt={`Gallery image ${index + 1}`}
                            loading={index === 0 ? "eager" : "lazy"}
                            className="w-full h-full object-cover"
                        />

                        {/* Download button per image */}
                        <button
                            onClick={() => handleDownload(url, index)}
                            className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg text-white text-sm hover:bg-black/90 transition flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Download this image"
                        >
                            ⬇️ Download
                        </button>

                        {/* Image counter */}
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white/80">
                            {index + 1} / {galleryUrls.length}
                        </div>
                    </div>
                ))}
            </div>

            {/* Photo count + Download All */}
            <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                <button
                    onClick={handleDownloadAll}
                    className="bg-garo-neon/20 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-garo-neon hover:bg-garo-neon/30 transition border border-garo-neon/30"
                    title="Download all images"
                >
                    ⬇️ All ({galleryUrls.length})
                </button>
            </div>

            {/* Swipe hint */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white/60 z-10 sm:hidden">
                ← swipe →
            </div>
        </div>
    );
};

export default GallerySwiper;
