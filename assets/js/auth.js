/**
 * auth.js - محرك المصادقة والحماية (متوافق مع Supabase)
 * يدير الجلسات وتوجيه الصفحات
 */
if (typeof window.TeraAuth !== 'undefined') {
    console.log('✅ [Auth] المحرك محمّل مسبقاً.');
} else {
    (function() {
        const TeraAuth = {
            _isChecking: false,
            _blockCheck: false,

            getCurrentPath: () => window.location.pathname,

            isAuthPage: (path) => path.includes('/auth/'),
            isProtectedPage: (path) => path.includes('/pages/'),
            isLandingPage: (path) => !this.isAuthPage(path) && !this.isProtectedPage(path),

            getRelativePath(targetPath) {
                const path = this.getCurrentPath();
                let depth = 0;
                if (path.includes('/pages/')) depth = 2;
                else if (path.includes('/auth/auth/')) depth = 3;
                else if (path.includes('/auth/')) depth = 2;
                return '../'.repeat(depth) + targetPath;
            },

            redirectTo(url) {
                if (this.getCurrentPath() !== url) window.location.replace(url);
            },

            // مزامنة الجلسة مع localStorage
            async syncSession(session) {
                if (session) {
                    localStorage.setItem('tera_token', session.access_token);
                    const user = session.user;
                    if (user) {
                        localStorage.setItem('tera_user', JSON.stringify({
                            id: user.id,
                            email: user.email,
                            name: user.user_metadata?.full_name || '',
                            role: 'partner'
                        }));
                    }
                } else {
                    localStorage.removeItem('tera_token');
                    localStorage.removeItem('tera_user');
                }
            },

            async getSession() {
                const supabase = window.teraSupabase;
                if (!supabase) return null;
                const { data } = await supabase.auth.getSession();
                return data.session;
            },

            async checkSession() {
                if (this._blockCheck || this._isChecking) return;
                this._isChecking = true;

                try {
                    const session = await this.getSession();
                    await this.syncSession(session);
                    const currentPath = this.getCurrentPath();
                    const isAuth = this.isAuthPage(currentPath);
                    const isProtected = this.isProtectedPage(currentPath);

                    if (!session && isProtected) {
                        this.redirectTo(this.getRelativePath('auth/auth/login/login.html'));
                    } else if (session && isAuth) {
                        this.redirectTo(this.getRelativePath('pages/dashboard/index.html'));
                    }
                } catch (e) {
                    console.warn('⚠️ [Auth] خطأ في فحص الجلسة:', e);
                } finally {
                    this._isChecking = false;
                }
            },

            async login(email, password) {
                const supabase = window.teraSupabase;
                if (!supabase) throw new Error('Supabase غير جاهز');
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                await this.syncSession(data.session);
                return data.user;
            },

            async logout() {
                const supabase = window.teraSupabase;
                if (supabase) await supabase.auth.signOut();
                localStorage.clear();
                this.redirectTo(this.getRelativePath('auth/auth/login/login.html'));
            },

            isLoggedIn() {
                return !!localStorage.getItem('tera_token');
            },

            getCurrentUser() {
                try {
                    return JSON.parse(localStorage.getItem('tera_user'));
                } catch {
                    return null;
                }
            },

            blockCheck() { this._blockCheck = true; },
            unblockCheck() { this._blockCheck = false; }
        };

        // ربط الكائن العام
        window.TeraAuth = TeraAuth;
        window.isUserLoggedIn = TeraAuth.isLoggedIn.bind(TeraAuth);
        window.getCurrentUser = TeraAuth.getCurrentUser.bind(TeraAuth);

        // استماع لتغييرات المصادقة
        if (window.teraSupabase) {
            window.teraSupabase.auth.onAuthStateChange(async (event, session) => {
                await TeraAuth.syncSession(session);
                if (event === 'SIGNED_OUT') TeraAuth.checkSession();
            });
        }

        // فحص أولي
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => TeraAuth.checkSession());
        } else {
            TeraAuth.checkSession();
        }
    })();
}
