@echo off
chcp 65001 >nul
title Oyun Durağı Pro - GitHub'a Gönder
cd /d "%~dp0"

echo.
echo  ==========================================
echo   OYUN DURAGI PRO ^| GitHub'a Gonderme
echo  ==========================================
echo   Depo: https://github.com/djbaba12/oyun
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo  [HATA] Git kurulu degil.
  echo  Indir: https://git-scm.com/download/win
  pause
  exit /b 1
)

REM uzak depo ayarli mi?
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo  [1/3] Uzak depo ekleniyor...
  git remote add origin https://github.com/djbaba12/oyun.git
) else (
  echo  [1/3] Uzak depo zaten ayarli: 
  git remote get-url origin
)

echo.
echo  [2/3] Dosyalar kontrol ediliyor...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Oyun Duragi Pro guncelleme" >nul
  echo        Yeni degisiklikler commit'lendi.
) else (
  echo        Degisiklik yok, mevcut commit gonderiliyor.
)

echo.
echo  [3/3] GitHub'a gonderiliyor...
echo        Sifre sorulursa: Personal Access Token yapistir
echo        ^(https://github.com/settings/tokens^)
echo.
git push -u origin main

if errorlevel 1 (
  echo.
  echo  [HATA] Gonderilemedi.
  echo  - Token'inda "repo" izni var mi?
  echo  - Eski kimlik bilgisi kayitli ise: Denetim Masasi - Kimlik Bilgisi Yoneticisi
  echo.
  pause
  exit /b 1
)

echo.
echo  ==========================================
echo   BASARILI! GitHub'a gonderildi.
echo  ==========================================
echo.
echo   Son adim: GitHub'da su ayari yap
echo   Depo - Settings - Pages - Source: GitHub Actions
echo.
echo   Yayin adresi: https://djbaba12.github.io/oyun/
echo.
start "" "https://github.com/djbaba12/oyun/settings/pages"
pause
