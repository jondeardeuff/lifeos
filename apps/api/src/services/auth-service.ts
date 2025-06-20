import { hash, verify } from 'argon2';
import { randomBytes } from 'crypto';
import { 
  AuthUser, 
  LoginCredentials, 
  RegisterCredentials, 
  AuthTokens, 
  AuthSession,
  RefreshTokenRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  ChangePasswordRequest,
  EmailVerificationRequest,
  EmailVerificationConfirm,
  AuthConfig,
  SessionStorage,
  RefreshTokenStorage
} from '@lifeos/types';
import { 
  generateTokens, 
  verifyRefreshToken, 
  generateSessionId, 
  rotateRefreshToken,
  JWTError 
} from '../utils/jwt.js';

export class AuthenticationError extends Error {
  constructor(message: string, public code: string, public field?: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export interface AuthServiceDependencies {
  userRepository: any; // Replace with actual user repository type
  sessionStorage: SessionStorage;
  refreshTokenStorage: RefreshTokenStorage;
  emailService?: any; // Replace with actual email service type
  config: AuthConfig;
}

/**
 * Authentication service handling user registration, login, token management
 */
export class AuthService {
  constructor(private deps: AuthServiceDependencies) {}

  /**
   * Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<{
    user: AuthUser;
    requiresEmailVerification: boolean;
  }> {
    const { email, password, fullName, phone, timezone = 'UTC' } = credentials;

    // Validate password requirements
    this.validatePassword(password);

    // Check if user already exists
    const existingUser = await this.deps.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AuthenticationError('User already exists with this email', 'USER_EXISTS', 'email');
    }

    // Check if phone is already used (if provided)
    if (phone) {
      const existingPhoneUser = await this.deps.userRepository.findByPhone(phone);
      if (existingPhoneUser) {
        throw new AuthenticationError('User already exists with this phone number', 'PHONE_EXISTS', 'phone');
      }
    }

    // Hash password
    const hashedPassword = await hash(password);

    // Create user
    const userData = {
      email,
      password: hashedPassword,
      fullName,
      phone,
      timezone,
      emailVerified: !this.deps.config.registration.requireEmailVerification,
      phoneVerified: false,
      settings: {},
    };

    const user = await this.deps.userRepository.create(userData);
    const authUser = this.mapUserToAuthUser(user);

    // Send email verification if required
    if (this.deps.config.registration.requireEmailVerification && this.deps.emailService) {
      await this.sendEmailVerification({ email });
    }

    return {
      user: authUser,
      requiresEmailVerification: this.deps.config.registration.requireEmailVerification,
    };
  }

  /**
   * Authenticate user and create session
   */
  async login(credentials: LoginCredentials): Promise<{
    user: AuthUser;
    tokens: AuthTokens;
    session: AuthSession;
  }> {
    const { email, password, rememberMe = false } = credentials;

    // Find user by email
    const user = await this.deps.userRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValidPassword = await verify(user.password, password);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if email verification is required
    if (this.deps.config.registration.requireEmailVerification && !user.emailVerified) {
      throw new AuthenticationError('Email verification required', 'EMAIL_NOT_VERIFIED');
    }

    // Create session
    const sessionId = generateSessionId();
    const authUser = this.mapUserToAuthUser(user);
    
    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      roles: await this.getUserRoles(user.id),
      sessionId,
      config: this.deps.config.jwt,
    });

    // Calculate session expiry
    const sessionExpiresAt = new Date(
      Date.now() + (rememberMe ? 
        7 * 24 * 60 * 60 * 1000 : // 7 days if remember me
        this.deps.config.session.maxAge
      )
    );

    // Create session object
    const session: AuthSession = {
      user: authUser,
      tokens,
      sessionId,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      expiresAt: sessionExpiresAt,
    };

    // Store session
    await this.deps.sessionStorage.set(sessionId, session);

    return {
      user: authUser,
      tokens,
      session,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<AuthTokens> {
    const { refreshToken } = request;

    try {
      // Verify refresh token
      const refreshPayload = verifyRefreshToken(refreshToken, this.deps.config.jwt.secret);

      // Get stored refresh token
      const storedToken = await this.deps.refreshTokenStorage.get(refreshPayload.tokenFamily);
      if (!storedToken || storedToken.token !== refreshToken) {
        // Token rotation security: if tokens don't match, invalidate all user sessions
        await this.invalidateAllUserSessions(refreshPayload.sub);
        throw new AuthenticationError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
      }

      // Get user data
      const user = await this.deps.userRepository.findById(refreshPayload.sub);
      if (!user) {
        throw new AuthenticationError('User not found', 'USER_NOT_FOUND');
      }

      // Delete old refresh token
      await this.deps.refreshTokenStorage.delete(refreshPayload.tokenFamily);

      // Generate new tokens with token rotation
      const newTokens = rotateRefreshToken(
        refreshPayload,
        {
          email: user.email,
          roles: await this.getUserRoles(user.id),
        },
        this.deps.config.jwt
      );

      // Store new refresh token
      const newRefreshPayload = verifyRefreshToken(newTokens.refreshToken, this.deps.config.jwt.secret);
      await this.deps.refreshTokenStorage.set(
        newRefreshPayload.tokenFamily,
        newTokens.refreshToken,
        user.id,
        new Date(newRefreshPayload.exp * 1000)
      );

      // Update session last accessed time
      const session = await this.deps.sessionStorage.get(refreshPayload.sessionId);
      if (session) {
        session.lastAccessedAt = new Date();
        session.tokens = newTokens;
        await this.deps.sessionStorage.set(refreshPayload.sessionId, session);
      }

      return newTokens;
    } catch (error) {
      if (error instanceof JWTError) {
        throw new AuthenticationError(error.message, error.code);
      }
      throw error;
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(sessionId: string): Promise<void> {
    // Get session to find refresh token
    const session = await this.deps.sessionStorage.get(sessionId);
    if (session) {
      // Delete refresh token if exists
      try {
        const refreshPayload = verifyRefreshToken(session.tokens.refreshToken, this.deps.config.jwt.secret);
        await this.deps.refreshTokenStorage.delete(refreshPayload.tokenFamily);
      } catch {
        // Ignore errors when cleaning up refresh token
      }
    }

    // Delete session
    await this.deps.sessionStorage.delete(sessionId);
  }

  /**
   * Logout user from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await this.invalidateAllUserSessions(userId);
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, request: ChangePasswordRequest): Promise<void> {
    const { currentPassword, newPassword } = request;

    // Get user
    const user = await this.deps.userRepository.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found', 'USER_NOT_FOUND');
    }

    // Verify current password
    const isValidPassword = await verify(user.password, currentPassword);
    if (!isValidPassword) {
      throw new AuthenticationError('Current password is incorrect', 'INVALID_PASSWORD');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Hash new password
    const hashedPassword = await hash(newPassword);

    // Update password
    await this.deps.userRepository.update(userId, { password: hashedPassword });

    // Invalidate all sessions except current one (optional - depends on requirements)
    await this.invalidateAllUserSessions(userId);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    const { email, callbackUrl } = request;

    // Find user (but don't reveal if user exists or not for security)
    const user = await this.deps.userRepository.findByEmail(email);
    if (!user) {
      // Still return success to avoid user enumeration
      return;
    }

    // Generate reset token
    const resetToken = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await this.deps.userRepository.setPasswordResetToken(user.id, resetToken, expiresAt);

    // Send email if service available
    if (this.deps.emailService) {
      await this.deps.emailService.sendPasswordReset({
        email,
        token: resetToken,
        callbackUrl,
      });
    }
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(request: PasswordResetConfirm): Promise<void> {
    const { token, password } = request;

    // Find user by reset token
    const user = await this.deps.userRepository.findByPasswordResetToken(token);
    if (!user || !user.passwordResetToken || user.passwordResetExpiresAt < new Date()) {
      throw new AuthenticationError('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
    }

    // Validate new password
    this.validatePassword(password);

    // Hash new password
    const hashedPassword = await hash(password);

    // Update password and clear reset token
    await this.deps.userRepository.update(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    });

    // Invalidate all user sessions
    await this.invalidateAllUserSessions(user.id);
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(request: EmailVerificationRequest): Promise<void> {
    const { email, callbackUrl } = request;

    const user = await this.deps.userRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('User not found', 'USER_NOT_FOUND');
    }

    if (user.emailVerified) {
      throw new AuthenticationError('Email already verified', 'EMAIL_ALREADY_VERIFIED');
    }

    // Generate verification token
    const verificationToken = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await this.deps.userRepository.setEmailVerificationToken(user.id, verificationToken, expiresAt);

    // Send email if service available
    if (this.deps.emailService) {
      await this.deps.emailService.sendEmailVerification({
        email,
        token: verificationToken,
        callbackUrl,
      });
    }
  }

  /**
   * Confirm email verification
   */
  async confirmEmailVerification(request: EmailVerificationConfirm): Promise<void> {
    const { token } = request;

    // Find user by verification token
    const user = await this.deps.userRepository.findByEmailVerificationToken(token);
    if (!user || !user.emailVerificationToken || user.emailVerificationExpiresAt < new Date()) {
      throw new AuthenticationError('Invalid or expired verification token', 'INVALID_VERIFICATION_TOKEN');
    }

    // Update user as verified and clear token
    await this.deps.userRepository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    });
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.deps.userRepository.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found', 'USER_NOT_FOUND');
    }

    return this.mapUserToAuthUser(user);
  }

  /**
   * Private helper methods
   */

  private validatePassword(password: string): void {
    const requirements = this.deps.config.passwords;

    if (password.length < requirements.minLength) {
      throw new AuthenticationError(
        `Password must be at least ${requirements.minLength} characters long`,
        'PASSWORD_TOO_SHORT',
        'password'
      );
    }

    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      throw new AuthenticationError(
        'Password must contain at least one uppercase letter',
        'PASSWORD_MISSING_UPPERCASE',
        'password'
      );
    }

    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      throw new AuthenticationError(
        'Password must contain at least one lowercase letter',
        'PASSWORD_MISSING_LOWERCASE',
        'password'
      );
    }

    if (requirements.requireNumbers && !/\d/.test(password)) {
      throw new AuthenticationError(
        'Password must contain at least one number',
        'PASSWORD_MISSING_NUMBER',
        'password'
      );
    }

    if (requirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new AuthenticationError(
        'Password must contain at least one special character',
        'PASSWORD_MISSING_SPECIAL',
        'password'
      );
    }
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    // This should query the user roles from the database
    // For now, return default role
    const userRoles = await this.deps.userRepository.getUserRoles(userId);
    return userRoles.map((role: any) => role.role);
  }

  private mapUserToAuthUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone || 'UTC',
      emailVerified: user.emailVerified || false,
      phoneVerified: user.phoneVerified || false,
      roles: [], // Will be populated separately
      settings: user.settings || {},
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async invalidateAllUserSessions(userId: string): Promise<void> {
    // Delete all sessions for user
    await this.deps.sessionStorage.deleteByUserId(userId);
    
    // Delete all refresh tokens for user
    await this.deps.refreshTokenStorage.deleteByUserId(userId);
  }
}