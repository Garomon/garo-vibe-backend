"use client";

interface GallerySwiperProps {
    galleryUrls: string[];
}

// Simple CSS scroll gallery - guaranteed to work on all devices
const GallerySwiper = ({ galleryUrls }: GallerySwiperProps) => {
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
                        className="flex-shrink-0 w-full h-full snap-center"
                    >
                        <img
                            src={url}
                            alt={`Gallery image ${index + 1}`}
                            loading={index === 0 ? "eager" : "lazy"}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ))}
            </div>

            {/* Photo count indicator */}
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white/80 z-10">
                📸 {galleryUrls.length}
            </div>

            {/* Swipe hint */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white/60 z-10">
                ← swipe →
            </div>
        </div>
    );
};

export default GallerySwiper;
