
import React from "react";
import { useNavigate } from "react-router-dom";
import { Scheme } from "@ronuse/norseu/core/variables";
import { ScrollPanel } from "@ronuse/norseu/core/panels";
import { Database, viewMeConsole } from "../../../utils";
import { Button, ButtonGroup } from "@ronuse/norseu/core/buttons";

let activeMedia;
let superMoviesByGenres;

function HomePreviews(props) {

    const navigate = useNavigate();
    const [previewMovie, setPreviewMovie] = React.useState({});
    const [previewIsFavourite, setPreviewIsFavourite] = React.useState(false);
    const [activelyWatchingPreview, setActivelyWatchingPreview] = React.useState(false);
    const { user, setLandingBackgroundImageLink, requestService, setCurrentGenre } = props.relaysProps;
    const genres = Database.getGenres(user, [{ field: "active", value: true }]);
    const [moviesByGenres, setMoviesByGenres] = React.useState(Object.keys(genres).reduce((a, v) => ({ ...a, [v]: [] }), {}));

    React.useEffect(() => {
        if (superMoviesByGenres) {
            resolveMediaListResult(superMoviesByGenres);
            return;
        }
        requestService.mapppedRequest(Object.keys(moviesByGenres).reduce((acc, genre) => {
            acc[genre] = requestService.getPopularComingSoonOrGenreLink(genres[genre]);
            return acc;
        }, {}), { slice: 100 }, true).then(res => {
            let genresWithMedias = res.data;
            const activelyWatching = Database.getActivelyWatchings(user);
            if (activelyWatching.length) {
                genresWithMedias = { [window.viewmore.i18nData.resume_watching]: activelyWatching, ...res.data };
            }
            superMoviesByGenres = genresWithMedias;
            resolveMediaListResult(superMoviesByGenres);
        }).catch(err => {
            viewMeConsole.error(err);
        });
    }, []);
 
    function resolveMediaListResult(genresWithMedias) {
        const previewRollete = ((genresWithMedias["Popular"] && genresWithMedias["Popular"].length)
            ? genresWithMedias["Popular"]
            : ((genresWithMedias[window.viewmore.i18nData.resume_watching] && genresWithMedias[window.viewmore.i18nData.resume_watching].length)
                ? genresWithMedias[window.viewmore.i18nData.resume_watching]
                : Object.values(genresWithMedias)[0]));
        if (!previewRollete) return;
        setMoviesByGenres(genresWithMedias);
        activeMedia = previewRollete[Math.floor(Math.random() * ((previewRollete.length - 1) - 0 + 1)) + 0] || previewMovie;
        setPreviewMovie(activeMedia);
        setPreviewIsFavourite(Database.isFavourite(activeMedia, user));
        setActivelyWatchingPreview(Database.isActivelyWatching(user, activeMedia));
        setLandingBackgroundImageLink(activeMedia.preview_image);
    }

    return (<div className="content">
        <div className="preview">
            <div className="blur"></div>
            <span className="title">{previewMovie.title}</span>
            {/* <span className="genres">Movie</span> */}
            <ButtonGroup className="controls" fill>
                <Button scheme={Scheme.LIGHT} className="b" onClick={() => {
                    Database.addToFavourite(activeMedia, user);
                    setPreviewIsFavourite(Database.isFavourite(activeMedia, user));
                    setActivelyWatchingPreview(Database.isActivelyWatching(user, activeMedia));
                }}>
                    <i className={previewIsFavourite ? `fa fa-minus ${user.color_scheme}-text` : "fa fa-plus"} />
                    {previewIsFavourite
                        ? <span className={previewIsFavourite ? user.color_scheme + "-text" : ""}>{window.viewmore.i18nData.favourite}</span>
                        : <span>{window.viewmore.i18nData.favourite}</span>}

                </Button>
                <Button onClick={() => goToMovie(activeMedia, activeMedia.final_media_link)} scheme={user.color_scheme} className="play">
                    <i className="fa fa-play" style={{ marginRight: 5 }} />
                    <span>{activelyWatchingPreview ? window.viewmore.i18nData.resume_watching : window.viewmore.i18nData.play}{" " + (activeMedia?.season_episode_name || "")}</span>
                </Button>
                <Button onClick={() => { delete activeMedia.final_media_link; goToMovie(activeMedia); }} scheme={Scheme.LIGHT} className="b">
                    <i className="fa fa-info" />
                    <span>{window.viewmore.i18nData.info}</span>
                </Button>
            </ButtonGroup>
        </div>
        <div className="sections" style={{ background: "black" }}>
            {Object.keys(moviesByGenres).map(moviesByGenre => {
                const medias = moviesByGenres[moviesByGenre] || [];
                if (previewMovie.title && (!medias || !medias.length)) return;

                return (<div key={moviesByGenre} className="section norseu-scrollpanel">
                    <span>{moviesByGenre}</span>
                    <ScrollPanel className="movie-list" scheme={user.color_scheme}>
                        {[...medias, { is_genre: true, genre: moviesByGenre }].map((movie, index) => {
                            return (<div key={index} onMouseEnter={() => {
                                if (!movie.preview_image) return;
                                activeMedia = movie; setPreviewMovie(movie);
                                setPreviewIsFavourite(Database.isFavourite(movie, user));
                                setActivelyWatchingPreview(Database.isActivelyWatching(user, movie));
                                setLandingBackgroundImageLink(movie.preview_image);
                            }}
                                onClick={() => (movie.is_genre ? setCurrentGenre(movie.genre) : goToMovie(movie))}
                                className={`${user.color_scheme} ${movie.is_genre ? "genre-button" : ""}`}
                                style={{ backgroundImage: (movie.is_genre ? "inherit" : `url('${movie.preview_image.replace("178x268", "500x700")}')`) }}>
                                {!movie.is_genre ? <div className="movie-title">{movie.title}</div> : null}
                                {movie.is_genre ? <i className="fa fa-arrow-right"></i> : null}
                                {movie.is_genre ? <span>View More</span> : null}
                            </div>);
                        })}
                    </ScrollPanel>
                </div>);
            })}
        </div>
    </div>);

    function goToMovie(movie, final_media_link) {
        if (final_media_link) {
            window.location = final_media_link;
            return;
        }
        const media = movie;
        navigate("/watch", { state: { user, media } });
    }

}

export default HomePreviews;