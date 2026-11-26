export type AppLang = 'id' | 'en';

export interface Translations {
  common: {
    brandName: string;
    copyright: string;
    pricesNote: string;
    loading: string;
    refresh: string;
    cancel: string;
    confirm: string;
    save: string;
    saving: string;
    edit: string;
    delete: string;
    close: string;
    backToShop: string;
    backToStorefront: string;
    backToOrders: string;
    signInGoogle: string;
    signOut: string;
    signedInAs: string;
    usd: string;
    free: string;
    each: string;
    perPack: string;
    qty: string;
    sale: string;
    active: string;
    inactive: string;
    protectedPreviewBadge: string;
  };
  nav: {
    home: string;
    shop: string;
    bundles: string;
    orders: string;
    admin: string;
    bag: string;
    openBagAria: string;
    openMenuAria: string;
    closeMenuAria: string;
    langToggleAria: string;
  };
  home: {
    eyebrow: string;
    heroTitle: string;
    heroSubtitle: string;
    browsePacks: string;
    viewBundles: string;
    heroNote: string;
    featuredCollections: string;
    featuredSubtitle: string;
    exploreCatalog: string;
    packSingular: string;
    packPlural: string;
    bestSellersTitle: string;
    bestSellersSubtitle: string;
    seeBestSellers: string;
    bundleEyebrow: string;
    bundleTitle: string;
    bundleDescPrefix: string;
    featuredNow: string;
    inspectBundle: string;
    browseBundles: string;
    newArrivalsTitle: string;
    newArrivalsSubtitle: string;
    shopNewReleases: string;
    newsletterEyebrow: string;
    newsletterTitle: string;
    newsletterDesc: string;
    newsletterPlaceholder: string;
    comingSoon: string;
    newsletterNotice: string;
  };
  shop: {
    title: string;
    subtitle: string;
    showing: string;
    productSingular: string;
    productPlural: string;
    searchPlaceholder: string;
    clearSearchAria: string;
    allTypes: string;
    typePack: string;
    typeBundle: string;
    typePrintable: string;
    anyPrice: string;
    under5: string;
    range5to10: string;
    over10: string;
    sortPopular: string;
    sortNewest: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    categoriesLabel: string;
    allCategories: string;
    resetFilters: string;
    emptyTitle: string;
    emptyBody: string;
    resetAllFilters: string;
  };
  product: {
    notFoundTitle: string;
    notFoundBody: string;
    breadcrumbShop: string;
    fileFormat: string;
    includedTitle: string;
    addToBag: string;
    digitalNoticeTitle: string;
    digitalNoticeBody: string;
    previewProtectionNote: string;
    pairsWellWith: string;
    addShort: string;
  };
  cart: {
    title: string;
    readySuffixSingular: string;
    readySuffixPlural: string;
    closeAria: string;
    emptyTitle: string;
    emptyBody: string;
    browseShop: string;
    subtotal: string;
    deliveryLabel: string;
    deliveryValue: string;
    total: string;
    checkoutButton: string;
  };
  checkout: {
    emptyTitle: string;
    emptyBody: string;
    exploreShop: string;
    editDetails: string;
    backToShop: string;
    titleForm: string;
    titleReview: string;
    subtitleForm: string;
    subtitleReview: string;
    step1: string;
    step2: string;
    customerInfoTitle: string;
    customerInfoSubtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    whatsappLabel: string;
    whatsappPlaceholder: string;
    whatsappHelp: string;
    noteLabel: string;
    notePlaceholder: string;
    howItWorksTitle: string;
    howItWorksBody: string;
    guestBanner: string;
    optionalGoogleSignIn: string;
    reviewOrderBtn: string;
    packsInBagTitle: string;
    itemsSuffix: string;
    subtotal: string;
    digitalDeliveryWa: string;
    totalUsd: string;
    reviewSectionTitle: string;
    reviewSectionSubtitle: string;
    whatsappPreviewLabel: string;
    signedInNoticePrefix: string;
    signedInNoticeMid: string;
    signedInNoticeSuffix: string;
    guestNotice: string;
    backToEdit: string;
    orderViaWaBtn: string;
    preparingWaBtn: string;
    verifiedSummaryTitle: string;
    handoffEyebrow: string;
    handoffTitleOpened: string;
    handoffTitleBlocked: string;
    handoffDescOpened: string;
    handoffDescBlocked: string;
    savedOrderBadgePrefix: string;
    savedOrderBadgeSuffix: string;
    viewMyOrders: string;
    importantTitle: string;
    importantBody: string;
    openWaChatBtn: string;
    copyMessage: string;
    copiedMessage: string;
    bagSavedNotice: string;
    clearBagNow: string;
    prefilledLabel: string;
    continueShopping: string;
    orderTotalLabel: string;
    serverValidatedBadge: string;
  };
  orders: {
    signInTitle: string;
    signInBody: string;
    pageTitle: string;
    openAdmin: string;
    emptyTitle: string;
    emptyBody: string;
    browsePacks: string;
    orderStatusLabel: string;
    paymentStatusLabel: string;
    totalLabel: string;
    paymentRejectedPrefix: string;
    submittedRefPrefix: string;
    submittedDatePrefix: string;
    waChannelTitle: string;
    continueOnWa: string;
    underReviewNote: string;
    resubmitNote: string;
    completePaymentNote: string;
    resubmitBtn: string;
    viewInstructionsBtn: string;
    payConfirmBtn: string;
    manualDeliveryReadyBadge: string;
    manualDeliveryPendingBadge: string;
    manualDeliveryAwaitingBadge: string;
    needFilesWaLink: string;
    deliveryInfoTitle: string;
    deliveryInfoBody: string;
  };
  orderPayment: {
    signInTitle: string;
    signInBody: string;
    unavailableTitle: string;
    headingPrefix: string;
    placedText: string;
    forText: string;
    verifiedBannerTitle: string;
    verifiedBannerBody: string;
    viewOrderStatusBtn: string;
    awaitingTitle: string;
    awaitingBodyPrefix: string;
    awaitingBodySuffix: string;
    yourNotePrefix: string;
    rejectedTitle: string;
    rejectedFallback: string;
    exactAmount: string;
    copyOrderNo: string;
    bankProvider: string;
    accountHolder: string;
    accountNumber: string;
    copy: string;
    scanQris: string;
    verifyMerchantPrefix: string;
    verifyMerchantSuffix: string;
    paypalTitle: string;
    paypalDescPrefix: string;
    paypalDescSuffix: string;
    paypalBtn: string;
    instructionsTitle: string;
    resubmitHeading: string;
    submitHeading: string;
    submitSubtitle: string;
    refLabel: string;
    refPlaceholder: string;
    noteLabel: string;
    notePlaceholder: string;
    receiptNoteTitle: string;
    receiptNoteBody: string;
    submittingBtn: string;
    submitBtn: string;
    orderSummaryHeading: string;
    subtotal: string;
    digitalDelivery: string;
    totalDueUsd: string;
    customerInfoTitle: string;
  };
  footer: {
    tagline: string;
    shopTitle: string;
    allPacks: string;
    bundles: string;
    printable: string;
    ordersLink: string;
    policiesTitle: string;
    policyDelivery: string;
    policyLicensing: string;
    policyRefunds: string;
    policyPrivacy: string;
    contactTitle: string;
    contactPrompt: string;
    deliveryFooterNote: string;
  };
  policies: {
    delivery: { title: string; subtitle: string; sections: { heading: string; body: string }[] };
    licensing: { title: string; subtitle: string; sections: { heading: string; body: string }[] };
    refunds: { title: string; subtitle: string; sections: { heading: string; body: string }[] };
    privacy: { title: string; subtitle: string; sections: { heading: string; body: string }[] };
  };
  errors: {
    enterFullName: string;
    invalidWhatsapp: string;
    emptyCart: string;
    itemUnavailable: string;
    invalidQuantity: string;
    rateLimited: string;
    duplicateOrder: string;
    serverRejected: string;
    paymentRefTooShort: string;
  };
  toasts: {
    signedIn: string;
    signedOut: string;
    addedToBag: string;
    bagCleared: string;
    waOpened: string;
    waCopied: string;
    copyFailed: string;
    paymentConfirmed: string;
  };
}

export const TRANSLATIONS: Record<AppLang, Translations> = {
  id: {
    common: {
      brandName: 'Cotton Candy Sticker',
      copyright: '© {year} Mystralis · Cotton Candy Sticker. Hak cipta ilustrasi dilindungi.',
      pricesNote: 'Harga dalam USD · Pengiriman file digital via WhatsApp',
      loading: 'Memuat...',
      refresh: 'Muat Ulang',
      cancel: 'Batal',
      confirm: 'Konfirmasi',
      save: 'Simpan',
      saving: 'Menyimpan...',
      edit: 'Edit',
      delete: 'Hapus',
      close: 'Tutup',
      backToShop: 'Kembali ke Toko',
      backToStorefront: 'Kembali ke Beranda',
      backToOrders: 'Kembali ke Pesanan Saya',
      signInGoogle: 'Masuk dengan Google',
      signOut: 'Keluar',
      signedInAs: 'Masuk sebagai',
      usd: 'USD',
      free: 'Gratis',
      each: 'satuan',
      perPack: '/ paket',
      qty: 'Jml',
      sale: 'Promo',
      active: 'Aktif',
      inactive: 'Nonaktif',
      protectedPreviewBadge: 'Pratinjau Watermark',
    },
    nav: {
      home: 'Beranda',
      shop: 'Katalog',
      bundles: 'Bundle',
      orders: 'Pesanan',
      admin: 'Admin',
      bag: 'Tas',
      openBagAria: 'Buka tas belanja berisi {count} item',
      openMenuAria: 'Buka menu navigasi',
      closeMenuAria: 'Tutup menu navigasi',
      langToggleAria: 'Ganti bahasa website',
    },
    home: {
      eyebrow: 'Butik Stiker Digital Pastel',
      heroTitle: 'Stiker pastel manis untuk jurnal & planner harianmu',
      heroSubtitle:
        'Ilustrasi karakter kawaii buatan tangan, kit planner fungsional, dan lembar PNG siap cetak 300 DPI. Pesan dengan mudah lewat WhatsApp dan file asli dikirim admin setelah verifikasi.',
      browsePacks: 'Jelajahi Katalog Stiker',
      viewBundles: 'Lihat Paket Bundle',
      heroNote: 'Format PNG & GoodNotes · File digital · Pengiriman manual via WhatsApp setelah pembayaran terverifikasi',
      featuredCollections: 'Koleksi Pilihan',
      featuredSubtitle: 'Tema pastel terkurasi berdasarkan gaya stiker dan kebutuhan jurnal.',
      exploreCatalog: 'Lihat semua katalog',
      packSingular: 'paket',
      packPlural: 'paket',
      bestSellersTitle: 'Paket Terlaris',
      bestSellersSubtitle: 'Karakter kawaii dan kit planner harian favorit pelanggan kami.',
      seeBestSellers: 'Lihat semua terlaris',
      bundleEyebrow: 'Bundle Studio Terkurasi',
      bundleTitle: 'Hemat hingga 30% dengan paket bundle multi-lembar yang serasi',
      bundleDescPrefix:
        'Gabungkan lembar karakter, washi pastel serasi, dan lembar PNG siap cetak dalam satu paket hemat.',
      featuredNow: 'Unggulan saat ini:',
      inspectBundle: 'Lihat Detail Bundle',
      browseBundles: 'Semua Paket Bundle',
      newArrivalsTitle: 'Rilisan Terbaru',
      newArrivalsSubtitle: 'Ilustrasi pastel segar, motif musiman, dan paket craft siap cetak.',
      shopNewReleases: 'Lihat rilisan baru',
      newsletterEyebrow: 'Buletin Studio · Segera Hadir',
      newsletterTitle: 'Info Rilis Stiker Pastel & Bonus Cetak',
      newsletterDesc:
        'Kami sedang menyiapkan buletin rilis stiker bulanan. Penyimpanan langganan email belum terhubung ke layanan email eksternal, jadi alamat email tidak disimpan pada versi ini.',
      newsletterPlaceholder: 'emailkamu@contoh.com',
      comingSoon: 'Segera Hadir',
      newsletterNotice:
        'Langganan buletin belum aktif karena layanan pengirim email belum dihubungkan. Tidak ada alamat email yang disimpan.',
    },
    shop: {
      title: 'Katalog Stiker',
      subtitle: 'Paket stiker PNG 300 DPI, buku stiker GoodNotes, lembar cetak, dan bundle hemat.',
      showing: 'Menampilkan',
      productSingular: 'produk',
      productPlural: 'produk',
      searchPlaceholder: 'Cari stiker, kelinci, planner, GoodNotes...',
      clearSearchAria: 'Hapus pencarian',
      allTypes: 'Semua Tipe Produk',
      typePack: 'Paket Stiker Satuan',
      typeBundle: 'Paket Bundle',
      typePrintable: 'Paket Siap Cetak PNG',
      anyPrice: 'Semua Harga',
      under5: 'Di bawah $5.00',
      range5to10: '$5.00 – $10.00',
      over10: 'Di atas $10.00',
      sortPopular: 'Terpopuler',
      sortNewest: 'Terbaru',
      sortPriceAsc: 'Harga: Terendah ke Tertinggi',
      sortPriceDesc: 'Harga: Tertinggi ke Terendah',
      categoriesLabel: 'Kategori:',
      allCategories: 'Semua Kategori',
      resetFilters: 'Reset filter',
      emptyTitle: 'Tidak ada paket stiker yang cocok dengan filter',
      emptyBody: 'Coba hapus kata kunci pencarian atau kembalikan ke semua kategori dan rentang harga.',
      resetAllFilters: 'Reset Semua Filter',
    },
    product: {
      notFoundTitle: 'Paket stiker tidak ditemukan',
      notFoundBody: 'Produk digital ini mungkin sedang dinonaktifkan atau dipindahkan.',
      breadcrumbShop: 'Katalog',
      fileFormat: 'Format File Asli (Dikirim via WhatsApp)',
      includedTitle: 'Yang Akan Kamu Dapatkan',
      addToBag: 'Tambah ke Tas',
      digitalNoticeTitle: 'Produk Digital · Pengiriman Manual via WhatsApp',
      digitalNoticeBody:
        'Gambar di halaman ini adalah pratinjau resolusi rendah ber-watermark. Tidak ada barang fisik yang dikirim dan tidak ada tautan unduhan di website — file asli beresolusi penuh dikirim langsung oleh admin via WhatsApp setelah pembayaran diverifikasi.',
      previewProtectionNote: 'Pratinjau ber-watermark untuk melindungi karya ilustrasi asli.',
      pairsWellWith: 'Cocok dipadukan dengan',
      addShort: 'Tambah',
    },
    cart: {
      title: 'Tas Stikermu',
      readySuffixSingular: 'paket siap dipesan',
      readySuffixPlural: 'paket siap dipesan',
      closeAria: 'Tutup tas belanja',
      emptyTitle: 'Tas stikermu masih kosong',
      emptyBody: 'Pilih paket stiker pastel, lembar PNG cetak, atau bundle planner favoritmu untuk dipesan lewat WhatsApp.',
      browseShop: 'Jelajahi Katalog Stiker',
      subtotal: 'Subtotal',
      deliveryLabel: 'Pengiriman File Digital (WhatsApp)',
      deliveryValue: 'Gratis',
      total: 'Total',
      checkoutButton: 'Lanjut ke Checkout',
    },
    checkout: {
      emptyTitle: 'Tas stikermu masih kosong',
      emptyBody: 'Pilih paket stiker kawaii favoritmu terlebih dahulu untuk melanjutkan pesanan via WhatsApp.',
      exploreShop: 'Lihat Katalog Stiker',
      editDetails: 'Ubah Detail Pesanan',
      backToShop: 'Kembali ke Katalog',
      titleForm: 'Checkout Stiker',
      titleReview: 'Konfirmasi Pesanan WhatsApp',
      subtitleForm: 'File stiker digital dikirim langsung oleh admin lewat WhatsApp setelah pembayaran diverifikasi — tanpa ongkos kirim.',
      subtitleReview: 'Periksa daftar paket dan pesan WhatsApp sebelum mengirim pesanan ke admin.',
      step1: '1. Data Pembeli',
      step2: '2. Tinjau & WhatsApp',
      customerInfoTitle: 'Informasi Pembeli',
      customerInfoSubtitle: 'Tidak perlu alamat rumah untuk produk stiker digital.',
      nameLabel: 'Nama Lengkap / Panggilan *',
      namePlaceholder: 'Nama lengkap atau panggilan kamu',
      whatsappLabel: 'Nomor WhatsApp (Opsional)',
      whatsappPlaceholder: '+628123456789 (opsional jika langsung chat)',
      whatsappHelp: 'Opsional jika kamu akan mengirim pesan langsung dari WhatsApp milikmu.',
      noteLabel: 'Catatan Pesanan (Opsional)',
      notePlaceholder: 'Format file yang diinginkan, catatan GoodNotes/Canva, atau permintaan khusus...',
      howItWorksTitle: 'Cara Kerja Checkout WhatsApp',
      howItWorksBody:
        'Setelah meninjau pesanan, klik Pesan via WhatsApp untuk membuka chat admin kami ({phone}) dengan rincian produk otomatis. Pembayaran dan pengiriman file asli dilakukan langsung bersama admin di WhatsApp.',
      guestBanner: 'Pesan sebagai tamu langsung bisa! Masuk dengan Google hanya jika ingin menyimpan riwayat pesanan di akunmu.',
      optionalGoogleSignIn: 'Masuk Google (Opsional)',
      reviewOrderBtn: 'Tinjau Pesanan WhatsApp',
      packsInBagTitle: 'Paket Stiker di Tas',
      itemsSuffix: 'item',
      subtotal: 'Subtotal',
      digitalDeliveryWa: 'Pengiriman Digital (WhatsApp)',
      totalUsd: 'Total (USD)',
      reviewSectionTitle: 'Tinjau Rincian Pesanan',
      reviewSectionSubtitle: 'Pastikan seluruh paket dan pesan di bawah sudah sesuai sebelum membuka WhatsApp ({phone}).',
      whatsappPreviewLabel: 'Pratinjau Pesan WhatsApp',
      signedInNoticePrefix: 'Pesananmu akan disimpan di riwayat akun',
      signedInNoticeMid: 'dengan status',
      signedInNoticeSuffix: 'sebelum membuka WhatsApp. Pembayaran diverifikasi manual dan file asli dikirim admin melalui WhatsApp.',
      guestNotice:
        'Kamu melakukan checkout sebagai tamu. Klik Pesan via WhatsApp untuk mengirim rincian lengkap ke admin kami. Pembayaran dan pengiriman file digital ditangani manual di WhatsApp.',
      backToEdit: 'Kembali Ubah Data',
      orderViaWaBtn: 'Pesan via WhatsApp',
      preparingWaBtn: 'Memvalidasi & Menyiapkan WhatsApp...',
      verifiedSummaryTitle: 'Ringkasan Item Terverifikasi',
      handoffEyebrow: 'Lanjutkan ke WhatsApp',
      handoffTitleOpened: 'Lanjutkan Pesananmu di WhatsApp',
      handoffTitleBlocked: 'Buka WhatsApp untuk Mengirim Pesanan',
      handoffDescOpened:
        'Kami telah membuka WhatsApp ke {phone}. Tekan Kirim di WhatsApp agar admin dapat mengonfirmasi pembayaran dan mengirimkan file stiker aslimu.',
      handoffDescBlocked:
        'Browser memblokir tab otomatis atau kamu berada di dalam frame pratinjau. Gunakan tombol WhatsApp langsung di bawah ini untuk mengirim pesanan ke {phone}.',
      savedOrderBadgePrefix: 'Tersimpan di Riwayat Pesanan',
      savedOrderBadgeSuffix: 'Status: Menunggu Kontak WhatsApp',
      viewMyOrders: 'Lihat Pesanan Saya',
      importantTitle: 'Penting:',
      importantBody:
        'Membuka WhatsApp tidak otomatis berarti pembayaran lunas. Verifikasi pembayaran manual dan pengiriman file stiker asli dilakukan oleh admin Cotton Candy Sticker di WhatsApp ({phone}).',
      openWaChatBtn: 'Buka Chat WhatsApp ({phone})',
      copyMessage: 'Salin Pesan',
      copiedMessage: 'Pesan Disalin',
      bagSavedNotice: 'Item di tas masih tersimpan hingga kamu membuka tautan WhatsApp di atas.',
      clearBagNow: 'Kosongkan Tas Sekarang',
      prefilledLabel: 'Pesan WhatsApp Siap Kirim',
      continueShopping: 'Lanjut Belanja Stiker',
      orderTotalLabel: 'Total Pesanan:',
      serverValidatedBadge: 'Harga & item diverifikasi server',
    },
    orders: {
      signInTitle: 'Masuk untuk melihat riwayat pesanan',
      signInBody:
        'Riwayat pesanan dan status pengiriman WhatsApp dilindungi verifikasi akun. Masuk dengan Google untuk memantau pesananmu.',
      pageTitle: 'Riwayat Pesanan & Pengiriman WhatsApp',
      openAdmin: 'Buka Dashboard Admin',
      emptyTitle: 'Belum ada pesanan',
      emptyBody:
        'Setelah kamu membuat pesanan di halaman checkout, status pembayaran dan status pengiriman manual via WhatsApp akan tampil di sini.',
      browsePacks: 'Lihat Katalog Stiker',
      orderStatusLabel: 'Status Pesanan',
      paymentStatusLabel: 'Status Pembayaran',
      totalLabel: 'Total',
      paymentRejectedPrefix: 'Pembayaran Ditolak:',
      submittedRefPrefix: 'Referensi Terkirim:',
      submittedDatePrefix: 'Dikirim',
      waChannelTitle: 'Pesanan WhatsApp · Pembayaran & Pengiriman File via {phone}',
      continueOnWa: 'Lanjutkan di WhatsApp',
      underReviewNote: 'Konfirmasi pembayaranmu sedang diperiksa oleh admin toko.',
      resubmitNote: 'Mohon periksa detail pembayaran dan kirim ulang nomor referensi transfer.',
      completePaymentNote: 'Selesaikan pembayaran manual dan kirim referensi transaksi untuk verifikasi admin.',
      resubmitBtn: 'Kirim Ulang Bukti / Referensi',
      viewInstructionsBtn: 'Lihat Instruksi Pembayaran',
      payConfirmBtn: 'Bayar & Konfirmasi Pembayaran',
      manualDeliveryReadyBadge: 'Terverifikasi · File dikirim manual via WhatsApp',
      manualDeliveryPendingBadge: 'Menunggu verifikasi pembayaran & pengiriman WhatsApp',
      manualDeliveryAwaitingBadge: 'Menunggu Verifikasi Admin · Pengiriman WhatsApp',
      needFilesWaLink: 'Hubungi Admin di WhatsApp ({phone})',
      deliveryInfoTitle: 'Catatan Pengiriman Digital',
      deliveryInfoBody:
        'Cotton Candy Sticker tidak menyediakan tautan unduhan publik di website demi melindungi hak karya. Semua file asli (PNG 300 DPI / GoodNotes / PDF) dikirim langsung oleh admin melalui WhatsApp resmi ({phone}) setelah pembayaran terverifikasi.',
    },
    orderPayment: {
      signInTitle: 'Masuk untuk melihat instruksi pembayaran',
      signInBody:
        'Instruksi pembayaran dan pengiriman referensi transaksi dilindungi verifikasi akun Google yang digunakan saat checkout.',
      unavailableTitle: 'Halaman Pembayaran Pesanan Tidak Tersedia',
      headingPrefix: 'Instruksi Pembayaran ·',
      placedText: 'Dibuat',
      forText: 'atas nama',
      verifiedBannerTitle: 'Pembayaran Terverifikasi · Siap Dikirim via WhatsApp',
      verifiedBannerBody:
        'Terima kasih! Pembayaran manualmu telah diverifikasi admin. File stiker digital asli dikirim langsung oleh admin ke WhatsApp kamu (hubungi {phone} jika belum menerima pesan).',
      viewOrderStatusBtn: 'Lihat Status Pesanan',
      awaitingTitle: 'Konfirmasi Pembayaran Diterima · Menunggu Verifikasi Admin',
      awaitingBodyPrefix: 'Kami telah mencatat referensi transaksi',
      awaitingBodySuffix:
        'Setelah admin memverifikasi mutasi masuk, file stiker digital aslimu akan dikirim secara manual melalui WhatsApp resmi kami.',
      yourNotePrefix: 'Catatanmu:',
      rejectedTitle: 'Verifikasi Pembayaran Memerlukan Perhatian',
      rejectedFallback:
        'Admin belum dapat mencocokkan referensi transaksi tersebut. Silakan periksa detail rekening di bawah dan kirim ulang referensi terbaru.',
      exactAmount: 'Nominal Tepat yang Harus Dibayar',
      copyOrderNo: 'Salin',
      bankProvider: 'Bank / Penyedia',
      accountHolder: 'Atas Nama',
      accountNumber: 'Nomor Rekening',
      copy: 'Salin',
      scanQris: 'Pindai Kode Pembayaran QRIS',
      verifyMerchantPrefix: 'Pastikan nama merchant sesuai',
      verifyMerchantSuffix: 'sebelum menyelesaikan transfer.',
      paypalTitle: 'Tautan Pembayaran PayPal',
      paypalDescPrefix: 'Buka tautan PayPal berikut di tab baru, kirim sejumlah',
      paypalDescSuffix: 'lalu kembali ke halaman ini untuk mengirimkan Transaction ID PayPal.',
      paypalBtn: 'Bayar lewat PayPal',
      instructionsTitle: 'Langkah-Langkah Pembayaran',
      resubmitHeading: 'Kirim Ulang Konfirmasi Pembayaran',
      submitHeading: 'Kirim Konfirmasi Pembayaran',
      submitSubtitle:
        'Setelah mentransfer, kirim nomor referensi transaksi di bawah agar admin dapat memverifikasi pembayaran dan mengirim file aslimu via WhatsApp.',
      refLabel: 'Referensi Pembayaran / ID Transaksi *',
      refPlaceholder: 'cth: TRF-2026-994821, QRIS RRN, atau PayPal Txn ID',
      noteLabel: 'Catatan / Detail Pengirim (Opsional)',
      notePlaceholder: 'Opsional: Nama pengirim, bank/e-wallet yang dipakai, atau waktu transfer',
      receiptNoteTitle: 'Catatan Bukti Transfer:',
      receiptNoteBody:
        'Unggah gambar bukti bayar langsung di website dinonaktifkan sementara aturan Firebase Storage belum dikonfigurasi. Cukup isi ID referensi di atas atau kirim tangkapan layar bukti transfer langsung ke WhatsApp resmi kami ({phone}).',
      submittingBtn: 'Mengirim Konfirmasi...',
      submitBtn: 'Konfirmasi Pembayaran & Minta Verifikasi',
      orderSummaryHeading: 'Ringkasan Pesanan',
      subtotal: 'Subtotal',
      digitalDelivery: 'Pengiriman Digital (WhatsApp)',
      totalDueUsd: 'Total Tagihan (USD)',
      customerInfoTitle: 'Info Pembeli',
    },
    footer: {
      tagline:
        'Butik stiker digital bernuansa pastel kawaii, kit GoodNotes, dan lembar PNG siap cetak untuk kreator planner di seluruh dunia.',
      shopTitle: 'Belanja',
      allPacks: 'Semua Paket Stiker',
      bundles: 'Paket Bundle',
      printable: 'Lembar PNG Siap Cetak',
      ordersLink: 'Riwayat Pesanan Saya',
      policiesTitle: 'Kebijakan',
      policyDelivery: 'Kebijakan Pengiriman Digital',
      policyLicensing: 'Lisensi Penggunaan Pribadi',
      policyRefunds: 'Kebijakan Pengembalian Dana',
      policyPrivacy: 'Kebijakan Privasi',
      contactTitle: 'Kontak & Bantuan',
      contactPrompt: 'Ada pertanyaan soal kompatibilitas file atau pesanan?',
      deliveryFooterNote: 'Produk digital · Pengiriman manual via WhatsApp ({phone}) · Tanpa pengiriman fisik',
    },
    policies: {
      delivery: {
        title: 'Kebijakan Pengiriman Digital',
        subtitle: 'File digital dikirim langsung melalui WhatsApp setelah verifikasi pembayaran.',
        sections: [
          {
            heading: 'Pengiriman Manual Resmi via WhatsApp',
            body: 'Seluruh paket stiker, kit planner, lembar cetak, dan bundle Cotton Candy Sticker dikirim secara elektronik langsung oleh admin melalui WhatsApp resmi (+6281238078363) setelah pembayaran diverifikasi. Tidak ada produk fisik yang dicetak atau dikirim lewat kurir, dan website tidak menyediakan tautan unduhan terbuka.',
          },
          {
            heading: 'Verifikasi Pembayaran Sebelum Pengiriman',
            body: 'Admin akan memeriksa referensi transaksi atau konfirmasi chat WhatsApp sebelum mengirimkan arsip file asli resolusi penuh (PNG 300 DPI / GoodNotes / PDF).',
          },
        ],
      },
      licensing: {
        title: 'Lisensi Penggunaan Pribadi',
        subtitle: 'Ketentuan penggunaan ilustrasi Cotton Candy Sticker.',
        sections: [
          {
            heading: 'Penggunaan Pribadi yang Diizinkan',
            body: 'Setiap pembelian memberikan lisensi pribadi non-eksklusif dan tidak dapat dipindahtangankan untuk mengimpor stiker ke GoodNotes, Notability, Zinnia, Procreate, atau mencetak di rumah untuk planner, jurnal, dan hadiah pribadi.',
          },
          {
            heading: 'Larangan Distribusi Ulang & Komersial Tanpa Izin',
            body: 'Dilarang keras menjual kembali, membagikan ulang file asli, mengunggah ke pustaka aset publik, menghapus watermark pratinjau, atau mengklaim ilustrasi Cotton Candy Sticker sebagai karya milik sendiri.',
          },
        ],
      },
      refunds: {
        title: 'Kebijakan Pengembalian Dana Digital',
        subtitle: 'Dukungan yang adil untuk produk kreatif digital.',
        sections: [
          {
            heading: 'Sifat Produk Digital',
            body: 'Karena file stiker digital tidak dapat ditarik kembali setelah dikirimkan, pesanan yang file aslinya sudah dikirimkan melalui WhatsApp bersifat final.',
          },
          {
            heading: 'File Rusak atau Pesanan Ganda',
            body: 'Jika arsip yang kamu terima bermasalah, terjadi pembelian ganda tanpa sengaja, atau butuh bantuan kompatibilitas, hubungi halo@cottoncandysticker.studio atau WhatsApp +6281238078363 beserta Nomor Pesanan.',
          },
        ],
      },
      privacy: {
        title: 'Kebijakan Privasi',
        subtitle: 'Cara kami melindungi data akun dan pesanan pelanggan.',
        sections: [
          {
            heading: 'Isolasi Data Akun & Pesanan',
            body: 'Akun pelanggan, alamat email, nomor WhatsApp, dan catatan pesanan disimpan di Cloud Firestore dengan aturan keamanan berbasis kepemilikan yang ketat sehingga hanya pemilik pesanan dan admin terverifikasi yang dapat mengaksesnya.',
          },
          {
            heading: 'Keamanan Pembayaran',
            body: 'Cotton Candy Sticker tidak pernah menyimpan nomor kartu kredit atau PIN perbankan di database. Pembayaran manual diverifikasi secara langsung menggunakan nomor referensi transaksi resmi.',
          },
        ],
      },
    },
    errors: {
      enterFullName: 'Mohon masukkan nama lengkap atau panggilanmu (minimal 2 karakter).',
      invalidWhatsapp: 'Masukkan nomor WhatsApp yang valid (cth: +628123456789) atau kosongkan saja.',
      emptyCart: 'Tas stikermu masih kosong.',
      itemUnavailable: 'Satu atau lebih produk di tasmu sudah tidak tersedia.',
      invalidQuantity: 'Jumlah tidak valid untuk produk "{name}".',
      rateLimited: 'Terlalu banyak permintaan checkout dalam waktu singkat. Mohon tunggu sebentar lalu coba lagi.',
      duplicateOrder: 'Pesanan yang sama baru saja dikirim. Silakan periksa halaman WhatsApp atau tunggu beberapa detik.',
      serverRejected: 'Validasi server menolak rincian pesanan. Muat ulang katalog dan coba kembali.',
      paymentRefTooShort: 'Masukkan nomor referensi atau ID transaksi pembayaran (minimal 2 karakter).',
    },
    toasts: {
      signedIn: 'Berhasil masuk dengan Google.',
      signedOut: 'Kamu telah keluar dari akun.',
      addedToBag: '"{name}" ditambahkan ke tas stiker.',
      bagCleared: 'Tas stiker dikosongkan.',
      waOpened: 'Jendela WhatsApp dibuka. Kirim pesanmu untuk melanjutkan pesanan.',
      waCopied: 'Pesan pesanan WhatsApp disalin.',
      copyFailed: 'Tidak dapat menyalin otomatis — silakan salin kotak pesan secara manual.',
      paymentConfirmed: 'Konfirmasi pembayaran dikirim untuk verifikasi admin.',
    },
  },
  en: {
    common: {
      brandName: 'Cotton Candy Sticker',
      copyright: '© {year} Mystralis · Cotton Candy Sticker. All artwork rights reserved.',
      pricesNote: 'Prices displayed in USD · Manual digital delivery via WhatsApp',
      loading: 'Loading...',
      refresh: 'Refresh',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      saving: 'Saving...',
      edit: 'Edit',
      delete: 'Delete',
      close: 'Close',
      backToShop: 'Back to Sticker Shop',
      backToStorefront: 'Back to Storefront',
      backToOrders: 'Back to My Orders',
      signInGoogle: 'Sign in with Google',
      signOut: 'Sign out',
      signedInAs: 'Signed in as',
      usd: 'USD',
      free: 'Free',
      each: 'each',
      perPack: '/ pack',
      qty: 'Qty',
      sale: 'Sale',
      active: 'Active',
      inactive: 'Inactive',
      protectedPreviewBadge: 'Watermarked Preview',
    },
    nav: {
      home: 'Home',
      shop: 'Shop',
      bundles: 'Bundles',
      orders: 'Orders',
      admin: 'Admin',
      bag: 'Bag',
      openBagAria: 'Open shopping bag with {count} items',
      openMenuAria: 'Open menu',
      closeMenuAria: 'Close menu',
      langToggleAria: 'Switch website language',
    },
    home: {
      eyebrow: 'Digital Sticker Boutique',
      heroTitle: 'Sweet pastel stickers for everyday planning',
      heroSubtitle:
        'Hand-illustrated kawaii characters, functional planner kits, and crisp 300 DPI printable PNG sheets. Order seamlessly via WhatsApp and receive your original digital files from our admin after verification.',
      browsePacks: 'Browse Sticker Packs',
      viewBundles: 'View Bundles',
      heroNote: 'PNG & GoodNotes formats · Digital files delivered via WhatsApp · No physical shipping',
      featuredCollections: 'Featured Collections',
      featuredSubtitle: 'Curated pastel themes organized by sticker style and workflow.',
      exploreCatalog: 'Explore full catalog',
      packSingular: 'pack',
      packPlural: 'packs',
      bestSellersTitle: 'Best-Selling Packs',
      bestSellersSubtitle: 'Most-loved kawaii characters and daily planner kits from our international community.',
      seeBestSellers: 'See all best sellers',
      bundleEyebrow: 'Curated Studio Bundle',
      bundleTitle: 'Save up to 30% with coordinated multi-sheet sticker bundles',
      bundleDescPrefix: 'Pair character sheets, matching pastel washi dividers, and printable PNG sheets in one cohesive bundle.',
      featuredNow: 'Featured now:',
      inspectBundle: 'Inspect Featured Bundle',
      browseBundles: 'Browse All Bundles',
      newArrivalsTitle: 'New Arrivals',
      newArrivalsSubtitle: 'Freshly illustrated pastel sheets, seasonal motifs, and printable craft packs.',
      shopNewReleases: 'Shop all new releases',
      newsletterEyebrow: 'Studio Dispatch · Coming Soon',
      newsletterTitle: 'Pastel Drop Alerts & Printable Freebies',
      newsletterDesc:
        'We are preparing our monthly sticker release newsletter. Email subscription storage is not yet connected to a mail delivery backend, so addresses are not submitted or stored in this release.',
      newsletterPlaceholder: 'you@example.com',
      comingSoon: 'Coming Soon',
      newsletterNotice:
        'Newsletter subscriptions are currently unavailable until an email service provider (such as Resend or Mailchimp) is connected. No email address was saved.',
    },
    shop: {
      title: 'Sticker Shop',
      subtitle: 'Watermarked previews for PNG packs, GoodNotes sticker books, printable sheets, and curated bundles.',
      showing: 'Showing',
      productSingular: 'product',
      productPlural: 'products',
      searchPlaceholder: 'Search stickers, bunnies, planner, GoodNotes...',
      clearSearchAria: 'Clear search',
      allTypes: 'All Product Types',
      typePack: 'Individual Sticker Packs',
      typeBundle: 'Bundles',
      typePrintable: 'Printable Packs',
      anyPrice: 'Any Price',
      under5: 'Under $5.00',
      range5to10: '$5.00 – $10.00',
      over10: 'Over $10.00',
      sortPopular: 'Popularity',
      sortNewest: 'Newest',
      sortPriceAsc: 'Price: Low to High',
      sortPriceDesc: 'Price: High to Low',
      categoriesLabel: 'Categories:',
      allCategories: 'All Categories',
      resetFilters: 'Reset filters',
      emptyTitle: 'No sticker packs matched your filters',
      emptyBody: 'Try clearing your search keyword or switching back to all categories and price ranges.',
      resetAllFilters: 'Reset All Filters',
    },
    product: {
      notFoundTitle: 'Sticker pack not found',
      notFoundBody: 'This digital product may have been unpublished or moved.',
      breadcrumbShop: 'Shop',
      fileFormat: 'Original File Formats (Sent via WhatsApp)',
      includedTitle: 'What Is Included',
      addToBag: 'Add to Bag',
      digitalNoticeTitle: 'Digital Product · Manual Delivery via WhatsApp',
      digitalNoticeBody:
        'Images shown on the storefront are low-resolution watermarked previews. No physical stickers are shipped and no public download links exist on this site — original high-resolution files are sent manually by our admin via WhatsApp after payment verification.',
      previewProtectionNote: 'Watermarked preview protecting original studio artwork.',
      pairsWellWith: 'Pairs well with',
      addShort: 'Add',
    },
    cart: {
      title: 'Your Sticker Bag',
      readySuffixSingular: 'pack ready',
      readySuffixPlural: 'packs ready',
      closeAria: 'Close shopping bag',
      emptyTitle: 'Your sticker bag is empty',
      emptyBody: 'Add pastel sticker packs, printable PNG sheets, or cozy planner bundles to order via WhatsApp.',
      browseShop: 'Browse Sticker Shop',
      subtotal: 'Subtotal',
      deliveryLabel: 'Digital Delivery (WhatsApp)',
      deliveryValue: 'Free',
      total: 'Total',
      checkoutButton: 'Proceed to Checkout',
    },
    checkout: {
      emptyTitle: 'Your sticker bag is empty',
      emptyBody: 'Pick your favorite kawaii sticker packs, printable PNG sheets, or cozy bundles to prepare a WhatsApp order.',
      exploreShop: 'Explore Sticker Shop',
      editDetails: 'Edit Order Details',
      backToShop: 'Back to Shop',
      titleForm: 'Cute Sticker Checkout',
      titleReview: 'Confirm WhatsApp Order',
      subtitleForm: 'Digital stickers are delivered manually via WhatsApp after payment verification — no shipping address needed.',
      subtitleReview: 'Review your sticker packs and pre-filled WhatsApp message before opening WhatsApp.',
      step1: '1. Details',
      step2: '2. Review & WhatsApp',
      customerInfoTitle: 'Customer Information',
      customerInfoSubtitle: 'No shipping address required for digital stickers.',
      nameLabel: 'Customer Name *',
      namePlaceholder: 'Your full name or nickname',
      whatsappLabel: 'WhatsApp Number (Optional)',
      whatsappPlaceholder: '+628123456789 (optional if chatting directly)',
      whatsappHelp: 'Optional if you will message us directly from your own WhatsApp account.',
      noteLabel: 'Order Note (Optional)',
      notePlaceholder: 'Preferred file format, GoodNotes/Canva notes, or special requests...',
      howItWorksTitle: 'How WhatsApp Checkout Works',
      howItWorksBody:
        'After reviewing your items, clicking Order via WhatsApp opens {phone} with your itemized cart ready to send. Payment verification and digital file delivery are handled directly by our admin in WhatsApp chat.',
      guestBanner: 'Ordering as a guest works right away! Sign in with Google only if you also want this order saved in your account history.',
      optionalGoogleSignIn: 'Optional Google Sign-In',
      reviewOrderBtn: 'Review WhatsApp Order',
      packsInBagTitle: 'Sticker Packs in Bag',
      itemsSuffix: 'items',
      subtotal: 'Subtotal',
      digitalDeliveryWa: 'Digital Delivery (WhatsApp)',
      totalUsd: 'Total (USD)',
      reviewSectionTitle: 'Review Your Order Details',
      reviewSectionSubtitle: 'Confirm your items and message below before opening WhatsApp ({phone}).',
      whatsappPreviewLabel: 'WhatsApp Message Preview',
      signedInNoticePrefix: 'Your order will be saved in Firestore under',
      signedInNoticeMid: 'with status',
      signedInNoticeSuffix: 'before opening WhatsApp. Payment verification and file delivery happen manually via WhatsApp.',
      guestNotice:
        'You are checking out as a guest. Clicking Order via WhatsApp sends your complete itemized order directly to WhatsApp without creating a Firestore account. Payment and delivery happen manually in WhatsApp chat.',
      backToEdit: 'Back to Edit',
      orderViaWaBtn: 'Order via WhatsApp',
      preparingWaBtn: 'Validating & Preparing WhatsApp Order...',
      verifiedSummaryTitle: 'Verified Item Summary',
      handoffEyebrow: 'WhatsApp Order Handoff',
      handoffTitleOpened: 'Continue Your Order on WhatsApp',
      handoffTitleBlocked: 'Open WhatsApp to Send Your Order',
      handoffDescOpened:
        'We opened WhatsApp for {phone}. Tap Send in WhatsApp so our studio can verify your payment and deliver your original digital sticker files.',
      handoffDescBlocked:
        'Your browser blocked the automatic WhatsApp tab or you are inside a preview frame. Use the direct WhatsApp button below to send your order to {phone}.',
      savedOrderBadgePrefix: 'Saved in your Orders History',
      savedOrderBadgeSuffix: 'Status: Pending WhatsApp Contact',
      viewMyOrders: 'View My Orders',
      importantTitle: 'Important:',
      importantBody:
        'Redirecting to WhatsApp does not mean payment is confirmed. Manual payment verification and original digital sticker delivery are handled directly by Cotton Candy Sticker on WhatsApp ({phone}).',
      openWaChatBtn: 'Open WhatsApp Chat ({phone})',
      copyMessage: 'Copy Message',
      copiedMessage: 'Copied Message',
      bagSavedNotice: 'Your bag items are still saved here until you open the WhatsApp link above.',
      clearBagNow: 'Clear Bag Now',
      prefilledLabel: 'Pre-filled WhatsApp Order Message',
      continueShopping: 'Continue Shopping Stickers',
      orderTotalLabel: 'Order Total:',
      serverValidatedBadge: 'Server-validated prices & quantities',
    },
    orders: {
      signInTitle: 'Sign in to view your orders',
      signInBody:
        'Your order history, manual payment instructions, and WhatsApp delivery status are protected by account verification. Sign in with Google to view your purchases.',
      pageTitle: 'Orders & WhatsApp Delivery',
      openAdmin: 'Open Admin Dashboard',
      emptyTitle: 'No orders yet',
      emptyBody:
        'Once you place an order at checkout, your payment status and WhatsApp file delivery status will appear here.',
      browsePacks: 'Browse Sticker Packs',
      orderStatusLabel: 'Order Status',
      paymentStatusLabel: 'Payment Status',
      totalLabel: 'Total',
      paymentRejectedPrefix: 'Payment Rejected:',
      submittedRefPrefix: 'Submitted Reference:',
      submittedDatePrefix: 'Submitted',
      waChannelTitle: 'WhatsApp Order · Manual Payment & File Delivery ({phone})',
      continueOnWa: 'Continue on WhatsApp',
      underReviewNote: 'Your payment confirmation is under review by our store admin.',
      resubmitNote: 'Please review payment details and resubmit your transaction reference.',
      completePaymentNote: 'Complete your manual payment and submit your reference ID for admin verification.',
      resubmitBtn: 'Resubmit Payment Confirmation',
      viewInstructionsBtn: 'View Payment Instructions',
      payConfirmBtn: 'Pay & Confirm Payment',
      manualDeliveryReadyBadge: 'Verified · Delivered via WhatsApp',
      manualDeliveryPendingBadge: 'Pending payment verification & WhatsApp delivery',
      manualDeliveryAwaitingBadge: 'Awaiting Verification · WhatsApp Delivery',
      needFilesWaLink: 'Message Admin on WhatsApp ({phone})',
      deliveryInfoTitle: 'Digital File Delivery Policy',
      deliveryInfoBody:
        'Cotton Candy Sticker does not host public download links on the website to protect original artwork. All full-resolution files (300 DPI PNG / GoodNotes / PDF) are sent manually by our admin via official WhatsApp ({phone}) after payment verification.',
    },
    orderPayment: {
      signInTitle: 'Sign in to view payment instructions',
      signInBody:
        'Order payment instructions and transaction submissions are protected by account verification. Sign in with the Google account used at checkout.',
      unavailableTitle: 'Order Payment Page Unavailable',
      headingPrefix: 'Payment Instructions ·',
      placedText: 'Placed',
      forText: 'for',
      verifiedBannerTitle: 'Payment Verified · Delivery via WhatsApp',
      verifiedBannerBody:
        'Thank you! Your manual payment has been verified. Original digital sticker files are sent manually by our admin via WhatsApp ({phone}).',
      viewOrderStatusBtn: 'View Order Status',
      awaitingTitle: 'Payment Confirmation Received · Awaiting Store Verification',
      awaitingBodyPrefix: 'We recorded your transaction reference',
      awaitingBodySuffix:
        'Once our admin verifies receipt of your payment, your original digital sticker files will be sent manually via our official WhatsApp.',
      yourNotePrefix: 'Your note:',
      rejectedTitle: 'Payment Verification Needs Attention',
      rejectedFallback:
        'Our team could not match the submitted transaction reference. Please review the payment details below and submit an updated reference.',
      exactAmount: 'Exact Amount to Send',
      copyOrderNo: 'Copy',
      bankProvider: 'Bank / Provider',
      accountHolder: 'Account Holder',
      accountNumber: 'Account Number',
      copy: 'Copy',
      scanQris: 'Scan QRIS Payment Code',
      verifyMerchantPrefix: 'Verify recipient name',
      verifyMerchantSuffix: 'before confirming transfer.',
      paypalTitle: 'PayPal Payment Link',
      paypalDescPrefix: 'Click below to open our PayPal payment page in a new tab, send',
      paypalDescSuffix: 'and then return here to submit your PayPal Transaction ID.',
      paypalBtn: 'Pay via PayPal Link',
      instructionsTitle: 'Step-by-Step Instructions',
      resubmitHeading: 'Resubmit Payment Confirmation',
      submitHeading: 'Submit Payment Confirmation',
      submitSubtitle:
        'After sending your payment, submit your transaction reference below so our admin can verify it and send your sticker files via WhatsApp.',
      refLabel: 'Payment Reference / Transaction ID *',
      refPlaceholder: 'e.g., TRF-2026-994821, QRIS RRN, or PayPal Txn ID',
      noteLabel: 'Optional Message / Sender Details',
      notePlaceholder: 'Optional: Sender account name, bank/e-wallet app used, or transfer time',
      receiptNoteTitle: 'Receipt Upload Note:',
      receiptNoteBody:
        'Direct website image proof upload is paused until Storage rules are enabled in Firebase Console. Submitting your accurate transaction reference above or sending your receipt screenshot to our WhatsApp ({phone}) is sufficient for verification.',
      submittingBtn: 'Submitting Confirmation...',
      submitBtn: 'Confirm Payment & Request Verification',
      orderSummaryHeading: 'Order Summary',
      subtotal: 'Subtotal',
      digitalDelivery: 'Digital Delivery (WhatsApp)',
      totalDueUsd: 'Total Due (USD)',
      customerInfoTitle: 'Customer Receipt Info',
    },
    footer: {
      tagline:
        'Soft pastel digital sticker packs, GoodNotes kits, and printable PNG sheets crafted for planners and creatives worldwide.',
      shopTitle: 'Shop',
      allPacks: 'All Sticker Packs',
      bundles: 'Sticker Bundles',
      printable: 'Printable PNG Sheets',
      ordersLink: 'My Orders & Delivery',
      policiesTitle: 'Policies',
      policyDelivery: 'Digital Delivery Policy',
      policyLicensing: 'Personal Use License',
      policyRefunds: 'Digital Refund Policy',
      policyPrivacy: 'Privacy Policy',
      contactTitle: 'Contact & Support',
      contactPrompt: 'Questions about file compatibility or orders?',
      deliveryFooterNote: 'Digital products · Manual WhatsApp delivery ({phone}) · No physical shipping',
    },
    policies: {
      delivery: {
        title: 'Digital Delivery Policy',
        subtitle: 'Digital sticker files delivered personally via WhatsApp after verification.',
        sections: [
          {
            heading: 'Manual WhatsApp Delivery Only',
            body: 'All sticker packs, planner kits, printable sheets, and bundles purchased from Cotton Candy Sticker are delivered electronically by our admin via official WhatsApp (+6281238078363) after payment verification. Nothing is physically mailed, and no public download links are exposed on this website.',
          },
          {
            heading: 'Verified Payment Authorization',
            body: 'Full-resolution archives (300 DPI PNG / GoodNotes / PDF) are sent only after verified payment confirmation in WhatsApp chat or through your order payment review.',
          },
        ],
      },
      licensing: {
        title: 'Personal Use License',
        subtitle: 'How you can enjoy Cotton Candy Sticker artwork.',
        sections: [
          {
            heading: 'Permitted Personal Use',
            body: 'Every purchase grants a non-exclusive, non-transferable personal license to import stickers into GoodNotes, Notability, Zinnia, Procreate, or print sheets at home for your personal planners, journals, and gifts.',
          },
          {
            heading: 'Prohibited Redistribution',
            body: 'You may not resell, redistribute, strip preview watermarks, upload to shared asset libraries, or claim Cotton Candy Sticker illustrations as your own digital or printed merchandise.',
          },
        ],
      },
      refunds: {
        title: 'Digital Refund Policy',
        subtitle: 'Fair support for digital creative goods.',
        sections: [
          {
            heading: 'Digital Goods Policy',
            body: 'Because digital sticker files cannot be returned once sent, completed digital purchases are final once the original files have been delivered via WhatsApp.',
          },
          {
            heading: 'Damaged Archives or Duplicate Orders',
            body: 'If you experience a corrupted file, accidental duplicate purchase, or compatibility question, contact halo@cottoncandysticker.studio or WhatsApp +6281238078363 with your Order Number and we will assist promptly.',
          },
        ],
      },
      privacy: {
        title: 'Privacy Policy',
        subtitle: 'How we protect customer account and order data.',
        sections: [
          {
            heading: 'Account & Order Isolation',
            body: 'Customer accounts, email addresses, WhatsApp contacts, and order records are stored in Cloud Firestore protected by strict ownership security rules so only you and authorized store administrators can view your order records.',
          },
          {
            heading: 'Payment Security',
            body: 'Cotton Candy Sticker never stores raw card numbers or banking credentials in our database. Manual payments are verified directly via transaction references.',
          },
        ],
      },
    },
    errors: {
      enterFullName: 'Please enter your full name (at least 2 characters).',
      invalidWhatsapp: 'Please enter a valid WhatsApp number (e.g., +628123456789) or leave it blank.',
      emptyCart: 'Your cart is empty.',
      itemUnavailable: 'One or more items in your cart are no longer available.',
      invalidQuantity: 'Invalid quantity for "{name}".',
      rateLimited: 'Too many checkout requests in a short window. Please wait a moment and try again.',
      duplicateOrder: 'An identical order was just submitted. Please check your WhatsApp tab or wait a few seconds.',
      serverRejected: 'Server validation rejected this order payload. Please refresh and try again.',
      paymentRefTooShort: 'Please enter your payment reference or transaction ID (at least 2 characters).',
    },
    toasts: {
      signedIn: 'Signed in successfully.',
      signedOut: 'Signed out.',
      addedToBag: 'Added "{name}" to your bag.',
      bagCleared: 'Sticker bag cleared.',
      waOpened: 'WhatsApp order window opened. Send your message to complete your order.',
      waCopied: 'WhatsApp order message copied.',
      copyFailed: 'Could not copy automatically — please copy the message box manually.',
      paymentConfirmed: 'Payment confirmation submitted for admin verification.',
    },
  },
};

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  );
}
