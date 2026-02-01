// Các thư viện JS chưa có @types chính thức
declare module "formatcoords";
declare module "mgrs";

// OpenLayers Extensions (ol-ext)
// Nếu bạn chưa tạo file định nghĩa chi tiết cho DayNight ở bước trước,
// dòng này sẽ giúp fix lỗi "implicitly has an 'any' type" nhanh chóng.
declare module "ol-ext/layer/GeoImage";
declare module "ol-ext/source/GeoImage";
declare module "ol-ext/interaction/Transform";
declare module "ol-ext/source/DayNight";

declare module "@orbat-mapper/convert-symbology";
declare module "d3-scale-chromatic";