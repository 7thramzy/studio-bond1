# إعداد اختيار ملفات الصوت من Google Drive

تستخدم لوحة الإدارة Google Picker لعرض الملفات التي يختارها المشرف صراحةً. بعد الاختيار ينزل المتصفح الملف المحدد ثم يرفعه إلى مساحة `orchest-media` الحالية؛ لا يحتفظ الموقع بتفويض Google أو بكلمة مرور حساب Drive، ولا تصبح ملفات Drive الأخرى متاحة للتطبيق. الحد الحالي 30 ميجابايت، والصيغ المدعومة MP3 وM4A وAAC وWAV وOGG وWebM.

## إعداد Google Cloud

1. اختر أو أنشئ مشروعًا في Google Cloud Console.
2. فعّل **Google Picker API** و**Google Drive API** للمشروع نفسه.
3. أنشئ مفتاح API، وقيّده إلى **Websites / HTTP referrers**. أضف `https://orchest.studio/*` و`https://orchest-studio.vercel.app/*` و`https://studio-bond1.vercel.app/*` وأي نطاق إنتاجي آخر تستخدمه. أضف أيضًا `https://docs.google.com/*` لأن نافذة Picker تُعرض من هذا النطاق. قيّد المفتاح إلى Google Picker API وGoogle Drive API فقط.
4. أنشئ OAuth Client ID من نوع **Web application**، وأضف نطاقات الموقع إلى **Authorized JavaScript origins**، مثل `https://orchest.studio` و`https://orchest-studio.vercel.app` و`http://localhost:5173` للاختبار المحلي. تدفق GIS المستخدم هنا يعتمد نافذة منبثقة ولا يتطلب Redirect URI.
5. استخدم المشروع نفسه لمفتاح API وOAuth Client ID ورقم المشروع المستخدم كـ App ID. جهّز شاشة موافقة OAuth واسم التطبيق. أثناء وضع الاختبار أضف حساب Google الذي سيستخدم لوحة الإدارة ضمن Test users.
6. استخدم نطاق `drive.file` فقط؛ يطلب التطبيق الوصول عندما يختار المشرف ملفًا، ولا يحتاج إلى قراءة كامل Drive.

## متغيرات البيئة

أضف القيم التالية إلى إعدادات المشروع على Vercel لكل بيئة مستخدمة، ثم أعد النشر:

- `VITE_GOOGLE_DRIVE_API_KEY`: مفتاح API المقيد بنطاق الموقع وواجهات Google المذكورة.
- `VITE_GOOGLE_DRIVE_CLIENT_ID`: معرّف OAuth Client الخاص بتطبيق الويب.
- `VITE_GOOGLE_DRIVE_APP_ID`: رقم مشروع Google Cloud، وليس اسم المشروع أو معرّفه النصي.

هذه قيم إعداد عامة تُضمّن في واجهة المتصفح، وليست أسرارًا. حماية API key تكون بتقييد النطاقات والواجهات في Google Cloud. لا تضع `client_secret` أو Service Account key في أي متغير يبدأ بـ `VITE_`، ولا يحتاج التطبيق إلى أي منهما.

عند غياب هذه المتغيرات يبقى رفع الملفات من الجهاز متاحًا، ويظهر خيار Google Drive معطّلًا. بعد إعدادها وإعادة النشر، يظهر الاختيار في نافذة إضافة/تعديل العمل.

## توثيق Google

- [دمج Google Picker في تطبيقات الويب](https://developers.google.com/workspace/drive/picker/guides/web-picker)
- [نموذج رموز الوصول في Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [تنزيل الملفات من Google Drive API](https://developers.google.com/drive/api/guides/manage-downloads)
- [صلاحيات Drive واستخدام drive.file](https://developers.google.com/drive/api/guides/api-specific-auth)
