cask "intent-memo" do
  arch arm: "aarch64", intel: "x64"

  version "0.0.0"
  sha256 arm:   "0000000000000000000000000000000000000000000000000000000000000000",
         intel: "0000000000000000000000000000000000000000000000000000000000000000"

  url "https://github.com/tkhwang/intent-memo/releases/download/v#{version}/IntentMemo_#{version}_#{arch}.dmg"
  name "Intent Memo"
  desc "Markdown memo editor for human intentions"
  homepage "https://github.com/tkhwang/intent-memo"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: ">= :high_sierra"

  app "IntentMemo.app"

  uninstall quit: "app.tkbetter.intentmemo"

end
