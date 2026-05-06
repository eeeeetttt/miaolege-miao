#!/bin/bash
# 金火银火 APP 打包脚本
# 使用方法: bash build-apk.sh

echo "开始构建金火银火 APP..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 需要安装 Node.js"
    exit 1
fi

# 创建临时目录
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

# 安装 Cordova
npm install -g cordova

# 创建应用
cordova create jinhuohuo com.jinhuohuo.app "金火银火"

cd jinhuohuo

# 添加 Android 平台
cordova platform add android

# 配置应用
cat > config.xml << 'CONFIG'
<?xml version='1.0' encoding='utf-8'?>
<widget id="com.jinhuohuo.app" version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
    <name>金火银火</name>
    <description>金火银火星球跟单平台</description>
    <content src="https://jinhuohuo.coze.site" />
    <access origin="*" />
    <allow-intent href="*" />
    <allow-navigation href="*" />
    <preference name="DisallowOverscroll" value="true" />
    <preference name="android-minSdkVersion" value="22" />
    <preference name="android-targetSdkVersion" value="34" />
</widget>
CONFIG

# 创建应用图标
mkdir -p res/icons
for size in 48 72 96 144 192; do
    # 创建简单的图标（可以用你的图标替换）
    convert -size ${size}x${size} xc:'#7c3aed' -fill '#fbbf24' -draw "circle $((size/2)),$((size/2)) $((size/2)),$((size/4))" res/icons/${size}.png 2>/dev/null || \
    node -e "
    const fs=require('fs');
    const zlib=require('zlib');
    function crc32(d){let c=0xffffffff;const t=[];for(let n=0;n<256;n++){let x=n;for(let k=0;k<8;k++)x=x&1?0xedb88320^(x>>>1):x>>>1;t[n]=x}for(let i=0;i<d.length;i++)c=t[(c^d[i])&0xff]^(c>>>8);return(c^0xffffffff)>>>0}
    function chunk(t,d){const b=Buffer.from(t);const l=Buffer.alloc(4);l.writeUInt32BE(d.length,0);const c=Buffer.concat([b,d]);const r=Buffer.alloc(4);r.writeUInt32BE(crc32(c),0);return Buffer.concat([l,b,d,r])}
    const s=Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
    const h=Buffer.alloc(13);h.writeUInt32BE($size,0);h.writeUInt32BE($size,4);h[8]=8;h[9]=2;
    const d=[];for(let y=0;y<$size;y++){d.push(0);for(let x=0;x<$size;x++){const cx=x-$size/2,cy=y-$size/2,r=Math.sqrt(cx*cx+cy*cy);if(r<$size*0.6)d.push(251,191,36);else if(r<$size*0.8)d.push(139,92,246);else d.push(124,58,246)}}
    const c=zlib.deflateSync(Buffer.from(d),{level:9});
    fs.writeFileSync('res/icons/${size}.png',Buffer.concat([s,chunk('IHDR',h),chunk('IDAT',c),chunk('IEND',Buffer.alloc(0))]));
    "
done

# 复制图标到各密度
cp res/icons/48.png res/icons/mdpi.png
cp res/icons/72.png res/icons/hdpi.png
cp res/icons/96.png res/icons/xhdpi.png
cp res/icons/144.png res/icons/xxhdpi.png
cp res/icons/192.png res/icons/xxxhdpi.png

# 构建 APK
echo "正在构建 APK..."
cordova build android --release

# 复制 APK 到当前目录
cp platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk ../jinhuohuo.apk 2>/dev/null || \
cp platforms/android/app/build/outputs/apk/android-release/*.apk ../jinhuohuo.apk 2>/dev/null

cd ..
if [ -f jinhuohuo.apk ]; then
    echo "构建成功！APK 文件: jinhuohuo.apk"
else
    echo "构建失败，请检查错误信息"
fi

# 清理
rm -rf "$TMP_DIR"
