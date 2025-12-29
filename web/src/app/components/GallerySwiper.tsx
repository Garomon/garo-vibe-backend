"use client";

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, A11y } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';

interface GallerySwiperProps {
    galleryUrls: string[];
}

const GallerySwiper = ({ galleryUrls }: GallerySwiperProps) => {
    return (
        <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 relative">
            <Swiper
                modules={[Pagination, A11y]}
                spaceBetween={0}
                slidesPerView={1}
                pagination={{
                    clickable: true,
                    bulletClass: 'gallery-bullet',
                    bulletActiveClass: 'gallery-bullet-active'
                }}
                grabCursor={true}
                className="w-full h-full gallery-swiper"
            >
                {galleryUrls.map((url, index) => (
                    <SwiperSlide key={index}>
                        <img
                            src={url}
                            alt={`Gallery image ${index + 1}`}
                            loading="lazy"
                            className="w-full h-full object-cover"
                        />
                    </SwiperSlide>
                ))}
            </Swiper>
            {/* Photo count indicator */}
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white/80 z-10">
                📸 {galleryUrls.length}
            </div>
        </div>
    );
};

export default GallerySwiper;
