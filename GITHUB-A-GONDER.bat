@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Oyun Duragi Pro - GitHub'a Gonder
cd /d "%~dp0"

echo.
echo  ==============================================
echo    OYUN DURAGI PRO  -  GitHub'a GONDER
echo  ==============================================
echo    Depo : https://github.com/djbaba12/oyun
echo    Adres: https://djbaba12.github.io/oyun/
echo  ==============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo  [HATA] Git kurulu degil.
  echo  Indir: https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

echo  Kullanici adi: djbaba12
echo.

set /p TOKEN=  Personal Access Token (ghp_... yapistir, ekranda gorunmez):
echo.

if "!TOKEN!"=="" (
  echo  [HATA] Token bos. Iptal edildi.
  echo  Token al: https://github.com/settings/tokens
  echo.
  pause
  exit /b 1
)

REM Token'i URL'ye gom (kalici olarak diske yazilmaz, sadece bu komut icin)
set "REMOTE=https://djbaba12:!TOKEN!@github.com/djbaba12/oyun.git"

echo  [1/4] Uzak depo ayarlaniyor...
git remote remove origin >nul 2>nul
git remote add origin "!REMOTE!"

echo  [2/4] Degisiklikler hazirlaniyor...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Oyun Duragi Pro guncelleme" >nul
  echo        Yeni degisiklikler commit'lendi.
) else (
  echo        Degisiklik yok.
)

echo  [3/4] GitHub'a gonderiliyor...
echo.
git -c credential.helper= push -u origin main --force

if errorlevel 1 (
  echo.
  echo  ==============================================
  echo    [HATA] Gonderilemedi!
  echo  ==============================================
  echo  Olasi sebepler:
  echo   1. Token yanlis veya suresi gecmis
  echo   2. Token'da "repo" izni yok
  echo   3. Internet baglantisi yok
  echo.
  echo  Yeni token: https://github.com/settings/tokens
  echo.
  pause
  exit /b 1
)

echo.
echo  [4/4] Token temizleniyor (guvenlik)...
git remote set-url origin https://github.com/djbaba12/oyun.git

echo.
echo  ==============================================
echo    BASARILI!  Dosyalar GitHub'a yuklendi.
echo  ==============================================
echo.
echo   SON ADIM: GitHub'da Pages'i ac
echo   Depo - Settings - Pages - Source: GitHub Actions
echo.
echo   Yayin adresi (1-2 dk sonra):
echo   https://djbaba12.github.io/oyun/
echo.

timeout /t 3 >nul
start "" "https://github.com/djbaba12/oyun/settings/pages"
echo  Pages ayar sayfasi acildi. Source: GitHub Actions sec ve Save'e bas.
echo.
pause
